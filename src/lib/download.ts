export function downloadPdf(bytes: Uint8Array, filename: string): void {
  // pdf-lib hands back a buffer-agnostic view; copy into a fresh
  // ArrayBuffer-backed view for the Blob constructor.
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
