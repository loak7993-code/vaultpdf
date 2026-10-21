import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface ThumbRenderHandle {
  promise: Promise<void>;
  cancel(): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Fit a rectangle inside a bounding box, preserving aspect ratio. */
export function containRect(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

/**
 * Render one PDF page into a canvas at roughly device resolution for the
 * given thumbnail box. Returns a handle so the caller can cancel the
 * underlying pdf.js render task when the card unmounts or re-renders.
 */
export function renderPageToCanvas(
  jsDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  boxWidth: number,
  boxHeight: number,
  devicePixelRatio: number,
): ThumbRenderHandle {
  let cancelled = false;
  let task: { cancel(): void } | null = null;

  const promise = new Promise<void>((resolve, reject) => {
    void (async () => {
      const page = await jsDoc.getPage(pageIndex + 1);
      if (cancelled) {
        resolve();
        return;
      }
      const base = page.getViewport({ scale: 1 });
      const scale = clamp(
        Math.min(
          (boxHeight * devicePixelRatio) / base.height,
          (boxWidth * devicePixelRatio) / base.width,
        ),
        0.05,
        4,
      );
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const renderTask = page.render({ canvas, viewport });
      task = renderTask;
      await renderTask.promise;
      resolve();
    })().catch(error => {
      reject(error instanceof Error ? error : new Error('Thumbnail render failed'));
    });
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      task?.cancel();
    },
  };
}
