import type { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { ExportPage, PageMaterial } from './build';

interface PdfSource {
  kind: 'pdf';
  name: string;
  /** pdf-lib document parsed from the original bytes, used at export time. */
  doc: PDFDocument;
  /** pdf.js document used for thumbnail rendering. */
  jsDoc: PDFDocumentProxy;
}

interface ImageSource {
  kind: 'image';
  name: string;
  /** Bytes shown in the <img> thumbnail, exactly as imported. */
  bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  /** Bytes embedded into exports. Differs from `bytes` only when an
   * EXIF-rotated photo had to be re-encoded so the export matches what the
   * user sees. */
  exportBytes: Uint8Array;
  exportMime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

export type SourceEntry = PdfSource | ImageSource;

/**
 * Module-level registry for non-serializable resources (pdf.js and pdf-lib
 * documents, image bytes). React state only ever holds plain descriptors
 * that reference entries here by id.
 */
const registry = new Map<string, SourceEntry>();

export const sources = {
  add(id: string, entry: SourceEntry): void {
    registry.set(id, entry);
  },
  get(id: string): SourceEntry | undefined {
    return registry.get(id);
  },
  remove(id: string): void {
    const entry = registry.get(id);
    if (entry?.kind === 'pdf') {
      // Best effort worker-side cleanup; the entry is discarded either way.
      entry.jsDoc.cleanup().catch(() => undefined);
    }
    registry.delete(id);
  },
  clear(): void {
    for (const id of Array.from(registry.keys())) {
      sources.remove(id);
    }
  },
};

export function loadMaterial(page: ExportPage): Promise<PageMaterial> {
  const entry = registry.get(page.group);
  if (!entry) {
    return Promise.reject(new Error(`Missing source data for page ${page.id}`));
  }
  if (entry.kind === 'pdf') {
    return Promise.resolve({ kind: 'pdf', source: entry.doc, pageIndex: page.pageIndex });
  }
  return Promise.resolve({
    kind: 'image',
    bytes: entry.exportBytes,
    mime: entry.exportMime,
  });
}
