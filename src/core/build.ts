import { PDFDocument, degrees } from 'pdf-lib';

/**
 * One page in an export request. `group` identifies the source file a page
 * belongs to, `pageIndex` is the page inside that source, and `rotation` is
 * the total clockwise rotation in degrees to bake into the output.
 */
export interface ExportPage {
  id: string;
  kind: 'pdf' | 'image';
  group: string;
  pageIndex: number;
  rotation: number;
}

/** Raw material a loader must provide for a single page. */
export type PageMaterial =
  | { kind: 'pdf'; source: PDFDocument; pageIndex: number }
  | { kind: 'image'; bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' };

export type PageMaterialLoader = (page: ExportPage) => Promise<PageMaterial>;

interface ImagePlacement {
  width: number;
  height: number;
  x: number;
  y: number;
  rotate: 0 | 90 | 180 | 270;
}

function normalizeRotation(value: number): 0 | 90 | 180 | 270 {
  const rotation = ((Math.round(value) % 360) + 360) % 360;
  if (rotation % 90 !== 0) {
    throw new Error(`Rotation must be a multiple of 90 degrees, received ${value}`);
  }
  return rotation as 0 | 90 | 180 | 270;
}

/**
 * Placement math for rotating an image inside the page that will hold it.
 * A clockwise rotation by r degrees is drawn counter-clockwise by 360 - r,
 * which keeps the picture unmirrored while the page takes the turned size.
 */
function imagePlacement(imageWidth: number, imageHeight: number, rotation: number): ImagePlacement {
  const rotationDegrees = normalizeRotation(rotation);
  switch (rotationDegrees) {
    case 90:
      return { width: imageHeight, height: imageWidth, x: 0, y: imageWidth, rotate: 270 };
    case 180:
      return { width: imageWidth, height: imageHeight, x: imageWidth, y: imageHeight, rotate: 180 };
    case 270:
      return { width: imageHeight, height: imageWidth, x: imageHeight, y: 0, rotate: 90 };
    default:
      return { width: imageWidth, height: imageHeight, x: 0, y: 0, rotate: 0 };
  }
}

/**
 * Assemble a PDF from an ordered list of page descriptors. PDF pages are
 * copied from their source documents and rotated; image pages are embedded
 * and drawn onto a page sized to the image. Pure aside from pdf-lib itself.
 */
export async function buildPdf(
  pages: readonly ExportPage[],
  load: PageMaterialLoader,
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  const out = await PDFDocument.create();
  for (const page of pages) {
    const material = await load(page);
    if (material.kind === 'pdf') {
      const [copied] = await out.copyPages(material.source, [material.pageIndex]);
      copied.setRotation(degrees(normalizeRotation(page.rotation)));
      out.addPage(copied);
    } else {
      const image =
        material.mime === 'image/png'
          ? await out.embedPng(material.bytes)
          : await out.embedJpg(material.bytes);
      const placement = imagePlacement(image.width, image.height, page.rotation);
      const pdfPage = out.addPage([placement.width, placement.height]);
      pdfPage.drawImage(image, {
        x: placement.x,
        y: placement.y,
        width: image.width,
        height: image.height,
        rotate: degrees(placement.rotate),
      });
    }
  }
  return out.save();
}
