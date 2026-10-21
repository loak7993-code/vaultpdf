# VaultPDF

A privacy-first PDF toolkit that runs entirely in your browser. Drop in PDFs and
images, see every page as a thumbnail, then reorder, rotate, delete, select and
export a new file. Nothing is uploaded, ever: the whole app is one HTML file you
can open offline, and it makes zero network requests while you use it.

Built for people who handle documents they would rather not send to a random
web service: contracts, IDs, medical records, client files. Every free online
PDF tool works by uploading your file to someone's server. VaultPDF works by
never leaving your machine.

## Features

- Merge PDFs in any order, with images mixed in as full pages
- Visual page grid with lazy-rendered thumbnails
- Drag-and-drop reordering, plus keyboard reordering (Alt+Arrow on a focused card)
- Multi-select: click, Shift-click for a range, Ctrl/Cmd-click for singles
- Rotate any page in 90-degree steps, delete pages, extract a selection as a new PDF
- Images become PDF pages sized to the image; EXIF orientation is applied on export
- Encrypted PDFs are rejected with a clear message instead of exporting garbage
- Works from a single file: open `dist/index.html` directly, no server needed
- Zero network activity, zero telemetry, zero accounts

## Quick start

```bash
npm install
npm run dev          # dev server
npm run build        # typecheck + production build into dist/index.html
```

The build is a single self-contained file. Open `dist/index.html` in any
modern browser, or host it anywhere static files are served.

## Configuration

There is nothing to configure. No env vars, no keys, no accounts. The app
makes no requests, so there is no backend to point it at.

## Build, test, verify

```bash
npm run build        # tsc --noEmit + vite build
npm test             # vitest: export logic (merge order, rotations, image pages)
npm run typecheck    # tsc only
```

The screenshots in `shots/` were taken from the real build at 390, 768 and
1440 px wide, plus loaded and selection states, with zero console errors.
`scripts/` contains the velox-automation drivers used for that verification
loop (`shoot.mjs`, `shoot-loaded.mjs`, `shoot-select.mjs`, `check-overflow.mjs`).

## Architecture

```
src/
  main.tsx               entry
  App.tsx                window-level drag and drop, file input, online state
  state/store.ts         small store (useSyncExternalStore) for all app state
  core/
    sources.ts           module registry for pdf.js docs, pdf-lib docs, image bytes
    pdfjs.ts             pdf.js setup with the worker inlined into the bundle
    build.ts             pure export assembly: page order, rotations, image pages
    images.ts            EXIF orientation parse and bake
    thumbs.ts            contain math and cancellable canvas rendering
    build.test.ts        vitest suite for the export logic
  components/            Sidebar, Toolbar, PageGrid, PageCard, EmptyState, Notices
```

Data flow: files are read in the browser, PDFs are parsed by pdf.js for
thumbnails and by pdf-lib at export time, images are decoded and (when needed)
re-encoded to bake their EXIF rotation. Export builds a fresh PDF document
from the current page order, rotations and selection, then triggers a download.

## Known limitations

- No compression: pdf-lib cannot recompress existing PDF streams, so exports
  keep the input's size characteristics. Images are embedded as decoded
  (re-encoded PNG/JPEG) data, which can be larger than the source image.
- No PDF form editing, no annotations, no OCR, no text extraction.
- Very large documents (hundreds of pages) render thumbnails lazily, but the
  full export still loads every source document in memory.
- The product ships as English only.
- There is no license key or DRM: the source is MIT and the paid download is
  the packaged, tested build. Paying is how you support the work.

## Support the project

If VaultPDF saves you an upload of a sensitive document, you can pay for it
directly with crypto, no platform in the middle:

- ETH / USDC (any EVM chain): `0x1663548d4348fb8dafdd72ce1d79687f677ae799`

## License

MIT
