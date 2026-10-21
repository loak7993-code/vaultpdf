import velox from '/root/velox/src/index.js';
import { readFileSync, writeFileSync } from 'fs';

const pdfB64 = readFileSync('/tmp/opencode/vaultpdf-test-12p.pdf').toString('base64');
const browser = await velox.launch({ browser: '/usr/bin/chromium-browser' });
const page = await browser.newPage({ viewport: [1440, 900] });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:8902/', { waitUntil: 'load' });
await page.eval(`async ({ b64pdf }) => {
  const bytes = Uint8Array.from(atob(b64pdf), c => c.charCodeAt(0));
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], 'quarterly-report-and-long-filename-2026-final-draft.pdf', { type: 'application/pdf' }));
  const input = document.querySelector('input[type=file]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}`, { b64pdf: pdfB64 });
await page.wait(3000);
const cards = await page.locator('[role=checkbox]').all();
console.log('cards found:', cards.length);
// select page 2, then shift-click page 5 for a range
await cards[1].click();
await page.keyboard.down('Shift');
await cards[4].click();
await page.keyboard.up('Shift');
await page.wait(300);
// rotate one selected page via its rotate button
await page.locator('[aria-label^="Rotate page"]').first().click();
await page.wait(600);
const png = await page.screenshot({ full: false });
writeFileSync('/root/vaultpdf/shots/selection.png', png);
console.log('errors:', errors.length);
await browser.close();
console.log(errors.length ? JSON.stringify(errors) : 'SELECTION SHOT OK');
