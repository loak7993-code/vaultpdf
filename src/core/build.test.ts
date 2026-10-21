import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildPdf, type ExportPage, type PageMaterialLoader } from './build';

// 4x2 pixel PNG generated with zlib (red pixels), decoded and verified
// against pdf-lib embedPng: 4 wide, 2 tall.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGN4pKECRwzIHACAuglxAwOgfgAAAABJRU5ErkJggg==';

function pngBytes(): Uint8Array {
  const binary = atob(TINY_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

describe('buildPdf', () => {
  it('merges PDF pages in order and applies rotation', async () => {
    const source = await PDFDocument.create();
    source.addPage([400, 200]);
    source.addPage([200, 400]);
    const pages: ExportPage[] = [
      { id: 'a:0', kind: 'pdf', group: 'a', pageIndex: 0, rotation: 90 },
      { id: 'a:1', kind: 'pdf', group: 'a', pageIndex: 1, rotation: 0 },
    ];
    const loader: PageMaterialLoader = async page => ({
      kind: 'pdf',
      source,
      pageIndex: page.pageIndex,
    });

    const out = await PDFDocument.load(await buildPdf(pages, loader));

    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(0).getRotation().angle).toBe(90);
    expect(out.getPage(0).getSize().width).toBe(400);
    expect(out.getPage(0).getSize().height).toBe(200);
    expect(out.getPage(1).getRotation().angle).toBe(0);
    expect(out.getPage(1).getSize().width).toBe(200);
    expect(out.getPage(1).getSize().height).toBe(400);
  });

  it('normalizes rotations beyond a full turn', async () => {
    const source = await PDFDocument.create();
    source.addPage([100, 100]);
    const pages: ExportPage[] = [
      { id: 'a:0', kind: 'pdf', group: 'a', pageIndex: 0, rotation: 450 },
    ];
    const loader: PageMaterialLoader = async () => ({ kind: 'pdf', source, pageIndex: 0 });

    const out = await PDFDocument.load(await buildPdf(pages, loader));

    expect(out.getPage(0).getRotation().angle).toBe(90);
  });

  it('sizes image pages to the image and swaps dimensions on quarter turns', async () => {
    const bytes = pngBytes();
    const loader: PageMaterialLoader = async () => ({ kind: 'image', bytes, mime: 'image/png' });

    const straight = await PDFDocument.load(
      await buildPdf([{ id: 'i:0', kind: 'image', group: 'i', pageIndex: 0, rotation: 0 }], loader),
    );
    const turned = await PDFDocument.load(
      await buildPdf([{ id: 'i:0', kind: 'image', group: 'i', pageIndex: 0, rotation: 90 }], loader),
    );

    expect(straight.getPage(0).getSize().width).toBe(4);
    expect(straight.getPage(0).getSize().height).toBe(2);
    expect(turned.getPage(0).getSize().width).toBe(2);
    expect(turned.getPage(0).getSize().height).toBe(4);
  });

  it('keeps a 180 degree image page at image dimensions', async () => {
    const bytes = pngBytes();
    const loader: PageMaterialLoader = async () => ({ kind: 'image', bytes, mime: 'image/png' });

    const out = await PDFDocument.load(
      await buildPdf([{ id: 'i:0', kind: 'image', group: 'i', pageIndex: 0, rotation: 180 }], loader),
    );

    expect(out.getPage(0).getSize().width).toBe(4);
    expect(out.getPage(0).getSize().height).toBe(2);
  });

  it('rejects empty page lists', async () => {
    const loader: PageMaterialLoader = async () => ({ kind: 'image', bytes: pngBytes(), mime: 'image/png' });
    await expect(buildPdf([], loader)).rejects.toThrow('No pages to export');
  });
});
