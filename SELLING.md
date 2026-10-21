# Selling VaultPDF: the path from $0 to $20 and beyond

The product is built, tested and verified. What is left is distribution, and
that part needs your accounts and your voice. Everything below is prepared so
each step takes minutes, not hours.

## The math

- Price: $7 on Gumroad (or pay-what-you-want with a $5 minimum).
- $20 = 3 sales at $7, or 4 sales at $5.
- Direct crypto payments (address in the README) have no platform cut.
- Every sale after the third is margin on work already done.

## Step 1: publish the repo (10 minutes)

```bash
cd /root/vaultpdf
git init && git add -A && git commit -m "VaultPDF 1.0.0"   # already done below
gh repo create vaultpdf --public --source=. --push
```

A public repo is the marketing engine: Show HN, Reddit and X all link to it.
The README carries the crypto address, so GitHub traffic can pay directly
with no platform and no fees.

## Step 2: set up the Gumroad product (10 minutes)

1. Create the account at gumroad.com (needs your email; I cannot do this part).
2. New product: digital product, name "VaultPDF", price $7.
3. Upload a zip of the repo (or just `dist/index.html` renamed `vaultpdf.html`
   plus the README) as the file.
4. Paste the listing copy below into the description.
5. Upload `shots/desktop.png`, `shots/loaded-desktop.png` and
   `shots/selection.png` as the gallery images. They are real screenshots of
   the real build, taken during verification.

## Step 3: the crypto wallet (5 minutes, do this first)

- The receive address is `0x1663548d4348fb8dafdd72ce1d79687f677ae799`.
- The private key is in `/root/vaultpdf-secrets/README.txt` (outside the repo,
  never committed). Import it into MetaMask, Rabby or any EVM wallet to
  access funds.
- Verify the address in the wallet matches the README before publishing.
- Move incoming funds to your main wallet promptly. The key lived on a build
  machine; treat it as a hot wallet.

## Listing copy (paste into Gumroad)

**VaultPDF: the PDF toolkit that never uploads your files**

Every free online PDF tool works the same way: your file goes to their server,
gets processed, and you trust their logs, their retention policy and their
breach history. For contracts, IDs and medical records that is a bad trade.

VaultPDF is one HTML file. Open it, drop in your PDFs and images, and arrange
pages visually: reorder, rotate, delete, multi-select, then export a merged
file or extract a selection. Images become pages. Everything happens inside
your browser tab. Disconnect your Wi-Fi and it works exactly the same.

- Merge, reorder, rotate, delete, extract
- Handles images as full pages, EXIF rotation included
- Zero uploads, zero telemetry, zero accounts
- Works offline, forever, on any machine with a browser

MIT-licensed and open source. Paying here supports the work and gets you the
packaged build with updates.

## Post drafts

**Show HN**

Title: `Show HN: VaultPDF - a PDF toolkit that is one HTML file and never uploads anything`

Body: I kept running into the same problem: I had contracts and ID scans I
needed to merge and rotate, and every tool that could do it wanted the file
uploaded to somebody's server. So I built a client-only toolkit: one HTML
file, pdf.js for thumbnails, pdf-lib for exports, no backend anywhere. Drag
pages to reorder, shift-click to select, rotate or delete, export. It runs
from disk with networking unplugged. Source is MIT, the build is tested
(logic tests plus screenshot passes at three widths). Happy to answer
questions about the single-file bundling or the pdf.js worker inlining.

**Reddit r/SideProject** (and optionally r/selfhosted, r/privacy)

Title: I built a PDF toolkit that is literally one HTML file and never uploads your documents

Body: short version of the same story, link to the repo, mention the
disconnect-your-Wi-Fi test because it is verifiable in ten seconds. Do not
lead with the price; lead with the privacy claim, the price is in the repo
and on Gumroad.

**X / Twitter (Leonxlnx)**

one-file PDF toolkit. merge, reorder, rotate, extract. zero uploads: turn
your wifi off and it still works. MIT + $7 packaged build, link in replies.

## Distribution checklist, in order

1. GitHub repo public with the screenshots in the README.
2. Show HN (Tuesday-Thursday, 8-10 CET or 9-12 ET tends to read best).
3. Reddit posts the same day, spaced a few hours apart.
4. X thread with one screenshot.
5. Gumroad link in the repo README ("buy the packaged build") and in post follow-ups.

## What honest success looks like

- 3 sales or one $20 crypto payment clears the first goal.
- Zero sales after real distribution is a signal, not a failure: the repo
  still earns stars and the asset keeps working. Iterate on the listing and
  the venue, not on fake urgency.
- Do not spam. One good Show HN post outperforms ten subreddits.

## Keep it upgradable

- Every change: bump the version in `package.json`, add a CHANGELOG entry,
  rebuild, re-run the screenshot loop, commit.
- The zip sold on Gumroad should always match a git tag.
