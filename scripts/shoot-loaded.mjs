import velox from '/root/velox/src/index.js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const shots = '/root/vaultpdf/shots';
mkdirSync(shots, { recursive: true });
const pdfB64 = readFileSync('/tmp/opencode/vaultpdf-test-12p.pdf').toString('base64');
// 300x500 blue PNG, no deps: raw RGBA scanlines, zlib stored deflate via pako-free trick (use CompressionStream)
async function makePng() {
  const w = 300, h = 500;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = 53; raw[o + 1] = 132; raw[o + 2] = 228; raw[o + 3] = 255;
    }
  }
  const cs = new CompressionStream('deflate');
  const compressed = Buffer.from(await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer());
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    // crc32
    let c = ~0;
    for (const b of crcBuf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    const crc = Buffer.alloc(4); crc.writeUInt32BE((~c) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const pngB64 = (await makePng()).toString('base64');

const browser = await velox.launch({ browser: '/usr/bin/chromium-browser' });
const problems = [];
for (const [name, width, height] of [['loaded-desktop', 1440, 900], ['loaded-mobile', 390, 844], ['loaded-tablet', 768, 1024]]) {
  const page = await browser.newPage({ viewport: [width, height] });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:8902/', { waitUntil: 'load' });
  await page.eval(`async ({ b64pdf, b64png }) => {
    const b64ToBytes = (b) => Uint8Array.from(atob(b), c => c.charCodeAt(0));
    const f1 = new File([b64ToBytes(b64pdf)], 'quarterly-report-and-long-filename-2026-final-draft.pdf', { type: 'application/pdf' });
    const f2 = new File([b64ToBytes(b64png)], 'diagram-sketch.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(f1); dt.items.add(f2);
    const input = document.querySelector('input[type=file]');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`, { b64pdf: pdfB64, b64png: pngB64 });
  await page.wait(3500);
  // select three pages: click card 2, ctrl-click card 4
  const cards = await page.locator('[data-page-id]').all();
  if (cards.length >= 5) {
    await cards[1].click();
    await page.keyboard.down('Control');
    await cards[3].click();
    await page.keyboard.up('Control');
    await page.wait(400);
  }
  const png = await page.screenshot({ full: true });
  writeFileSync(`${shots}/${name}.png`, png);
  const count = await page.text('body').then((t) => (t.match(/\d+ pages/) || ['?'])[0]);
  console.log(name, 'cards:', cards.length, 'label:', count, 'errors:', errors.length);
  if (errors.length) problems.push({ name, errors });
  await page.close();
}
await browser.close();
if (problems.length) { console.log(JSON.stringify(problems)); process.exit(2); }
console.log('LOADED SHOTS OK');
