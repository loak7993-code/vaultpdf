import { useSyncExternalStore } from 'react';
import { PDFDocument } from 'pdf-lib';
import { buildPdf, type ExportPage } from '../core/build';
import { prepareImage } from '../core/images';
import { getDocument } from '../core/pdfjs';
import { loadMaterial, sources } from '../core/sources';
import { downloadPdf } from '../lib/download';

export type PageKind = 'pdf' | 'image';
export type Rotation = 0 | 90 | 180 | 270;

export interface SourceMeta {
  id: string;
  name: string;
  kind: PageKind;
  pageCount: number;
}

export interface PageItem {
  id: string;
  sourceId: string;
  kind: PageKind;
  pageIndex: number;
  /** Rotation the page already has on disk, as pdf.js reports it. */
  baseRotation: Rotation;
  /** Additional clockwise rotation applied by the user. */
  rotation: Rotation;
  /** Displayed width/height before any user rotation. */
  width: number;
  height: number;
}

export interface Notice {
  id: string;
  text: string;
}

export interface VaultState {
  sources: readonly SourceMeta[];
  pages: readonly PageItem[];
  selection: readonly string[];
  online: boolean;
  notices: readonly Notice[];
  importing: number;
  exporting: 'merged' | 'extract' | null;
}

const initialState: VaultState = {
  sources: [],
  pages: [],
  selection: [],
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  notices: [],
  importing: 0,
  exporting: null,
};

let state: VaultState = initialState;
const listeners = new Set<() => void>();

function set(patch: Partial<VaultState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

let noticeSeq = 0;

function notify(text: string): void {
  const id = `notice-${noticeSeq}`;
  noticeSeq += 1;
  set({ notices: [...state.notices, { id, text }] });
  window.setTimeout(() => dismissNotice(id), 8000);
}

function dismissNotice(id: string): void {
  if (!state.notices.some(notice => notice.id === id)) return;
  set({ notices: state.notices.filter(notice => notice.id !== id) });
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (/encrypt/i.test(error.message)) return 'Encrypted PDFs are not supported.';
    if (/password/i.test(error.message)) return 'Password-protected PDFs are not supported.';
    return error.message;
  }
  return 'Something went wrong.';
}

const PDF_EXT = /\.pdf$/i;
const JPG_EXT = /\.jpe?g$/i;

function detectKind(file: File): PageKind | null {
  if (file.type === 'application/pdf' || PDF_EXT.test(file.name)) return 'pdf';
  if (file.type === 'image/png' || /\.png$/i.test(file.name)) return 'image';
  if (file.type === 'image/jpeg' || JPG_EXT.test(file.name)) return 'image';
  return null;
}

let sourceSeq = 0;

function nextSourceId(): string {
  sourceSeq += 1;
  return `src-${sourceSeq}`;
}

function coerceRotation(value: number): Rotation {
  const rotation = ((Math.round(value) % 360) + 360) % 360;
  return ((rotation % 90 === 0 ? rotation : 0) as Rotation);
}

async function importFile(file: File): Promise<void> {
  const kind = detectKind(file);
  if (!kind) throw new Error('Unsupported type. Use PDF, PNG or JPG.');
  const id = nextSourceId();

  if (kind === 'pdf') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes);
    } catch (error) {
      throw new Error(describeError(error));
    }
    // pdf.js may take ownership of the buffer it is handed, so give it a copy
    // and keep the original for pdf-lib.
    const jsDoc = await getDocument({ data: bytes.slice() }).promise;
    if (jsDoc.numPages === 0) throw new Error('This PDF has no pages.');
    const pages: PageItem[] = [];
    for (let index = 0; index < jsDoc.numPages; index += 1) {
      const pdfPage = await jsDoc.getPage(index + 1);
      const viewport = pdfPage.getViewport({ scale: 1 });
      pages.push({
        id: `${id}:${index}`,
        sourceId: id,
        kind: 'pdf',
        pageIndex: index,
        baseRotation: coerceRotation(pdfPage.rotate),
        rotation: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }
    sources.add(id, { kind: 'pdf', name: file.name, doc, jsDoc });
    commit(id, file.name, 'pdf', pages);
    return;
  }

  const prepared = await prepareImage(file);
  sources.add(id, {
    kind: 'image',
    name: file.name,
    bytes: prepared.bytes,
    mime: prepared.mime,
    exportBytes: prepared.exportBytes,
    exportMime: prepared.exportMime,
    width: prepared.width,
    height: prepared.height,
  });
  commit(id, file.name, 'image', [
    {
      id: `${id}:0`,
      sourceId: id,
      kind: 'image',
      pageIndex: 0,
      baseRotation: 0,
      rotation: 0,
      width: prepared.width,
      height: prepared.height,
    },
  ]);
}

function commit(id: string, name: string, kind: PageKind, pages: PageItem[]): void {
  set({
    sources: [...state.sources, { id, name, kind, pageCount: pages.length }],
    pages: [...state.pages, ...pages],
  });
}

async function addFiles(list: FileList | readonly File[]): Promise<void> {
  const files = Array.from(list);
  if (files.length === 0) return;
  const supported = files.filter(file => detectKind(file) !== null);
  const rejected = files.filter(file => detectKind(file) === null);
  if (rejected.length > 0) {
    notify(`${rejected.map(file => file.name).join(', ')}: unsupported type. Use PDF, PNG or JPG.`);
  }
  if (supported.length === 0) return;

  set({ importing: state.importing + supported.length });
  for (const file of supported) {
    try {
      await importFile(file);
    } catch (error) {
      notify(`${file.name}: ${describeError(error)}`);
    } finally {
      set({ importing: Math.max(0, state.importing - 1) });
    }
  }
}

let anchorId: string | null = null;

function togglePage(id: string): void {
  const selected = state.selection.includes(id);
  set({
    selection: selected ? state.selection.filter(item => item !== id) : [...state.selection, id],
  });
}

function clickPage(id: string, mods: { shiftKey: boolean; metaKey: boolean }): void {
  if (mods.shiftKey) {
    const anchor = anchorId ?? id;
    const from = state.pages.findIndex(page => page.id === anchor);
    const to = state.pages.findIndex(page => page.id === id);
    if (from === -1 || to === -1) {
      togglePage(id);
      return;
    }
    const [low, high] = from < to ? [from, to] : [to, from];
    set({ selection: state.pages.slice(low, high + 1).map(page => page.id) });
    return;
  }
  anchorId = id;
  togglePage(id);
}

function rotatePages(ids: readonly string[], direction: 1 | -1): void {
  const idSet = new Set(ids);
  set({
    pages: state.pages.map(page =>
      idSet.has(page.id)
        ? {
            ...page,
            rotation: ((((page.rotation + direction * 90) % 360) + 360) % 360) as Rotation,
          }
        : page,
    ),
  });
}

function selectionFilter(pages: readonly PageItem[]): readonly string[] {
  const alive = new Set(pages.map(page => page.id));
  return state.selection.filter(id => alive.has(id));
}

function deletePages(ids: readonly string[]): void {
  const idSet = new Set(ids);
  const pages = state.pages.filter(page => !idSet.has(page.id));
  pruneSources(pages);
}

function pruneSources(pages: readonly PageItem[]): void {
  const referenced = new Set(pages.map(page => page.sourceId));
  for (const source of state.sources) {
    if (!referenced.has(source.id)) sources.remove(source.id);
  }
  set({
    pages,
    sources: state.sources.filter(source => referenced.has(source.id)),
    selection: selectionFilter(pages),
  });
}

function removeSource(id: string): void {
  const pages = state.pages.filter(page => page.sourceId !== id);
  sources.remove(id);
  set({
    pages,
    sources: state.sources.filter(source => source.id !== id),
    selection: selectionFilter(pages),
  });
}

function clearAll(): void {
  sources.clear();
  anchorId = null;
  set({ sources: [], pages: [], selection: [] });
}

function movePage(from: number, to: number): void {
  const count = state.pages.length;
  if (count === 0) return;
  const source = Math.min(Math.max(from, 0), count - 1);
  const target = Math.min(Math.max(to, 0), count - 1);
  if (source === target) return;
  const pages = [...state.pages];
  const [moved] = pages.splice(source, 1);
  pages.splice(target, 0, moved);
  set({ pages });
}

function nudgePage(id: string, delta: -1 | 1): void {
  const index = state.pages.findIndex(page => page.id === id);
  if (index === -1) return;
  movePage(index, index + delta);
}

function toExportPage(page: PageItem): ExportPage {
  return {
    id: page.id,
    kind: page.kind,
    group: page.sourceId,
    pageIndex: page.pageIndex,
    rotation: (((page.baseRotation + page.rotation) % 360) + 360) % 360,
  };
}

function buildStamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

async function runExport(mode: 'merged' | 'extract', pages: readonly PageItem[]): Promise<void> {
  if (pages.length === 0 || state.exporting !== null) return;
  set({ exporting: mode });
  try {
    const bytes = await buildPdf(pages.map(toExportPage), loadMaterial);
    downloadPdf(bytes, `vaultpdf-${mode}-${buildStamp()}.pdf`);
  } catch (error) {
    notify(`Export failed: ${describeError(error)}`);
  } finally {
    set({ exporting: null });
  }
}

function exportMerged(): Promise<void> {
  return runExport('merged', state.pages);
}

function exportExtract(): Promise<void> {
  const selected = new Set(state.selection);
  return runExport(
    'extract',
    state.pages.filter(page => selected.has(page.id)),
  );
}

function setOnline(online: boolean): void {
  if (state.online !== online) set({ online });
}

export const vault = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getState(): VaultState {
    return state;
  },
  addFiles,
  clickPage,
  rotatePages,
  deletePages,
  removeSource,
  clearAll,
  movePage,
  nudgePage,
  dismissNotice,
  exportMerged,
  exportExtract,
  setOnline,
};

export function useVault(): VaultState {
  return useSyncExternalStore(vault.subscribe, vault.getState, vault.getState);
}
