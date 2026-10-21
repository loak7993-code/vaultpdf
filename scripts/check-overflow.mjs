import velox from '/root/velox/src/index.js';
import { readFileSync } from 'fs';

const pdfB64 = readFileSync('/tmp/opencode/vaultpdf-test-12p.pdf').toString('base64');
const browser = await velox.launch({ browser: '/usr/bin/chromium-browser' });
let bad = 0;
for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: [width, height] });
  await page.goto('http://127.0.0.1:8902/', { waitUntil: 'load' });
  await page.eval(`async ({ b64pdf }) => {
    const bytes = Uint8Array.from(atob(b64pdf), c => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'quarterly-report-and-long-filename-2026-final-draft.pdf', { type: 'application/pdf' }));
    const input = document.querySelector('input[type=file]');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`, { b64pdf: pdfB64 });
  await page.wait(2500);
  const r = await page.eval(`() => {
    const de = document.documentElement;
    const overflowEls = [...document.querySelectorAll('*')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.right > window.innerWidth + 1 || rect.left < -1;
    }).slice(0, 4).map((el) => el.tagName + '.' + String(el.className).slice(0, 40));
    return { scrollW: de.scrollWidth, innerW: window.innerWidth, overflow: de.scrollWidth > window.innerWidth, overflowEls };
  }`);
  const flag = r.overflow ? 'OVERFLOW' : 'ok';
  if (r.overflow) bad++;
  console.log(`${width}x${height}: ${flag} scrollW=${r.scrollW} innerW=${r.innerW}${r.overflowEls.length ? ' els=' + JSON.stringify(r.overflowEls) : ''}`);
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
