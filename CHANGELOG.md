# Changelog

## 1.0.0 - 2026-10-21

Initial release.

- Import PDFs and images (JPG, PNG) by drag and drop or file picker
- Visual page grid with lazy-rendered thumbnails and skeleton placeholders
- Drag-and-drop reordering plus keyboard reordering (Alt+Arrow)
- Multi-select: click, Shift-click range, Ctrl/Cmd-click singles
- Rotate pages in 90-degree steps, delete pages
- Export: merged PDF from the current order, or extract the selection as a new PDF
- Images export as pages sized to the image, with EXIF orientation baked on export
- Encrypted PDFs rejected at import with an inline notice
- Single-file production build that runs offline from disk with zero network requests
- Vitest suite covering export logic; verified at 390 / 768 / 1440 px with zero console errors
