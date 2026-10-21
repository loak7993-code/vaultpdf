import velox from '/root/velox/src/index.js';
import { mkdirSync, writeFileSync } from 'fs';

const shots = '/root/vaultpdf/shots';
mkdirSync(shots, { recursive: true });
const viewports = [
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
];
const browser = await velox.launch({ browser: '/usr/bin/chromium-browser' });
const problems = [];
for (const [name, width, height] of viewports) {
  const page = await browser.newPage({ viewport: [width, height] });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
  await page.goto('http://127.0.0.1:8902/', { waitUntil: 'load' });
  await page.wait(1200);
  const png = await page.screenshot({ full: true });
  writeFileSync(`${shots}/${name}.png`, png);
  if (errors.length) problems.push({ name, errors });
  console.log(name, 'shot ok, console errors:', errors.length);
  await page.close();
}
await browser.close();
if (problems.length) { console.log(JSON.stringify(problems, null, 2)); process.exit(2); }
console.log('ALL CLEAN');
