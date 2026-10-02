// Deterministic combo-card scan assets, one per BCSC test persona (output is committed; rerun after
// changing payloads or sizes): node scripts/generate-scan-assets.mjs
//
// Sauce upscales an injected image to fill the camera frame, so a code's decodability is governed by
// its FRACTION of image width, not its pixel size. The authoring rules these choices follow are
// documented in e2e/README.md ("Authoring injected scan images").
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import bwipjs from 'bwip-js'
import sharp from 'sharp'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/images/scan')

/** The 16:9 canvas `injectScanTarget` composes onto — width fractions below are of the card, which
 *  is then centred on this canvas. */
const CANVAS_WIDTH = 1920
/** Card canvas at the real card-back proportions (402:271, from the shared SIT template), sized to
 *  the frame height so the composed image needs only white side bars. */
const CARD_H = 1080
const CARD_W = Math.round((CARD_H * 402) / 271)

/**
 * One combo-card back per BCSC persona in `src/constants.ts`.
 *
 * ScanSerial completes only on a matching PAIR — the serial from the 1D code-39 and the birthdate
 * from the PDF-417 — so every card carries both, keyed to that persona's SIT values. The non-BCSC
 * persona (fred) has no card serial and gets no asset.
 */
const CARDS = [
  { persona: 'shaggy', lastName: 'ROGERS', firstName: 'SHAGGY', serial: 'C42606379', birthDate: '19981114' },
  { persona: 'velma', lastName: 'DINKLEY', firstName: 'VELMA', serial: 'C82643367', birthDate: '19951217' },
  { persona: 'daphne', lastName: 'BLAKE', firstName: 'DAPHNE', serial: 'C26444539', birthDate: '19800922' },
]

/** Expiry (YYMM) in track 2. Any future date works — the app reads only the birthdate here. */
const EXPIRY_YYMM = '2601'

/** Fixed-width field: space-padded, never longer. */
const fixed = (text, width) => text.padEnd(width).slice(0, width)

/**
 * The PDF-417 payload in ICBC's 3-track layout, which is what the app's spec-based parser accepts —
 * track 1 `%<province><city>^<last>,$<first>^<street>$<city line>^?`, track 2 `;<IIN><card
 * number>=<YYMM expiry><YYYYMMDD birth>=?`, and track 3 an 82-character fixed-width block whose
 * security field (offset 70) zero-pads the card serial. The parser rejects the whole code when any
 * track is malformed, so the synthetic fields (licence number, address, physical traits) only need to
 * be well-formed; `/device/barcodes` matches on the serial and birthdate.
 */
function cardPayload({ lastName, firstName, serial, birthDate }) {
  const postalCode = 'V8W 3Y8'
  const track1 = `%BCVICTORIA^${lastName},$${firstName}^910 GOVERNMENT ST$VICTORIA BC  ${postalCode}^?`
  const track2 = `;6360282222222=${EXPIRY_YYMM}${birthDate}=?`
  const track3 =
    '_%0A' +
    fixed(postalCode.replace(' ', ''), 11) +
    fixed('', 16) +
    'M180 80BRNBLU' +
    fixed('', 10) + // PHN: none on a licence
    fixed('', 16) +
    fixed(`00${serial}`, 11) +
    '?'
  return track1 + track2 + track3
}

/**
 * Render a barcode at `targetWidth`. Resampling is nearest-neighbour: smooth kernels (lanczos et al)
 * blur bar edges, and a merged narrow bar in a checksum-free symbology like code-39 decodes as a
 * SHORTER string with no error — a silently wrong serial.
 */
async function barcodeAtWidth(opts, targetWidth) {
  const raw = await bwipjs.toBuffer({ backgroundcolor: 'FFFFFF', ...opts })
  const { height: rawHeight = 0 } = await sharp(raw).metadata()
  return { image: await sharp(raw).resize({ width: targetWidth, kernel: 'nearest' }).toBuffer(), rawHeight }
}

/**
 * Build one card back, legibility-first: both codes along the card's long side at maximum module
 * size. Not card-realistic — the real back puts the code-39 vertically along the short side — but
 * ScanSerial needs BOTH codes decoded and any undecodable detection reroutes the flow, so the asset
 * optimises for a clean first read over fidelity.
 *
 * `columns` is the lever that matters for the PDF-417: module width is fixed by column count (data
 * region = columns × 17 modules), not payload length, so fewer columns means fatter modules at the
 * same physical width.
 */
async function buildCard(card) {
  const pdfColumns = 4
  const pdfWidth = Math.round(0.92 * CARD_W)
  // Squash to a card-like band. Only row height changes — module WIDTH, which sets decodability, is
  // untouched — and the band is tall enough that the 3-track payload's rows stay well above MLKit's
  // few-pixel minimum (the generator prints px per row).
  const { image: rawPdf417, rawHeight: rawPdfH } = await barcodeAtWidth(
    { bcid: 'pdf417', text: cardPayload(card), scale: 6, columns: pdfColumns },
    pdfWidth
  )
  const pdf417 = await sharp(rawPdf417)
    .resize({ width: pdfWidth, height: Math.round(0.3 * CARD_H), fit: 'fill' })
    .toBuffer()
  // Code-39 at its NATIVE scale — no resampling at all, because a blurred bar merges and this
  // symbology has no checksum to catch it (an early run silently read C2644539 for C26444539).
  const serialCode = await bwipjs.toBuffer({
    bcid: 'code39',
    text: card.serial,
    scale: 8,
    height: 10,
    backgroundcolor: 'FFFFFF',
  })

  const { width: pdfW = 0, height: pdfH = 0 } = await sharp(pdf417).metadata()
  const { width: serW = 0, height: serH = 0 } = await sharp(serialCode).metadata()
  // Modules across a PDF-417 row: start + left indicator + data + right indicator + stop.
  const modulesAcross = 8 + 17 + pdfColumns * 17 + 17 + 9
  // bwip-js draws rows 3 modules tall at `scale` px per module before the band squash.
  const pdfRows = Math.round(rawPdfH / (3 * 6))
  // A 9-character code-39 with its two 10-module quiet zones spans 163 modules.
  console.log(
    `  pdf417 ${pdfW}x${pdfH} (${pdfColumns} cols, ${(pdfW / modulesAcross).toFixed(1)}px/module, ` +
      `${pdfRows} rows at ${(pdfH / pdfRows).toFixed(1)}px/row), serial ${serW}x${serH} (${(serW / 163).toFixed(1)}px/module)`
  )

  return sharp({ create: { width: CARD_W, height: CARD_H, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([
      { input: serialCode, left: Math.round((CARD_W - serW) / 2), top: Math.round(0.08 * CARD_H) },
      { input: pdf417, left: Math.round((CARD_W - pdfW) / 2), top: CARD_H - pdfH - Math.round(0.06 * CARD_H) },
    ])
    .png()
    .toBuffer()
}

mkdirSync(OUT_DIR, { recursive: true })
for (const card of CARDS) {
  const file = `card_${card.persona}.png`
  console.log(`${file}  serial=${card.serial}  birthdate=${card.birthDate}`)
  const png = await buildCard(card)
  await writeFile(join(OUT_DIR, file), png)
  const { width, height } = await sharp(png).metadata()
  console.log(`  card ${width}x${height}px  fraction-of-${CANVAS_WIDTH}=${(width / CANVAS_WIDTH).toFixed(2)}`)
}
