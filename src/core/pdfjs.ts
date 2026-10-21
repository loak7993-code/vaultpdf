import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

let workerReady = false;

function ensureWorker(): void {
  if (workerReady) return;
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  workerReady = true;
}

/**
 * Single entry point for opening PDFs. The pdf.js worker is inlined into the
 * bundle and started on first use, so documents parse off the main thread.
 */
export function getDocument(source: { data: Uint8Array }) {
  ensureWorker();
  return pdfjs.getDocument({ data: source.data });
}
