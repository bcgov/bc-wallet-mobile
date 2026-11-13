/**
 * The back of a BC Services Card as the app's scanners read it, rendered for the holder a journey
 * scans: the serial as a Code 39 over a PDF-417 in ICBC's three-track layout. Built for a clean read,
 * not for likeness: both codes run along the long side at the largest modules that fit. The sizing
 * rules are in ../../README.md ("Authoring injected images").
 */
import bwipjs from 'bwip-js'
import sharp from 'sharp'
import type { TestUser } from '../constants.js'

/** What the two codes say about the holder. Everything else on the card is made up. */
export interface CardBack {
  surname: string
  givenName: string
  /** The card serial: the Code 39's whole content, and the PDF-417's security field. */
  serial: string
  /** `YYYYMMDD`. */
  birthDate: string
  /** `YYMM`. */
  expiry: string
}

/** A card's term. Nothing depends on it: `/device/barcodes` takes an expiry in the past as well. */
const YEARS_TO_EXPIRY = 5

/** The card at its real proportions (402:271), as tall as the 1080p frame it is composed onto. */
const CARD_HEIGHT = 1080
const CARD_WIDTH = Math.round((CARD_HEIGHT * 402) / 271)
const PDF417_WIDTH = Math.round(0.92 * CARD_WIDTH)
const PDF417_HEIGHT = Math.round(0.3 * CARD_HEIGHT)
/** Column count, not payload length, sets the module width: the data region is `columns × 17` modules. */
const PDF417_COLUMNS = 4

const POSTAL_CODE = 'V8W 3Y8'

/** bwip-js types no symbology's own options, such as the PDF-417's column count. */
type Pdf417Options = bwipjs.RenderOptions & { columns: number }

/** The card back of a holder, expiring a card's term after `now`. */
export function cardBackOf(holder: TestUser, now: Date = new Date()): CardBack {
  if (holder.flow === 'non-bcsc') {
    throw new Error('A holder without a card has no card back to scan')
  }
  const year = String((now.getUTCFullYear() + YEARS_TO_EXPIRY) % 100).padStart(2, '0')
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return {
    surname: holder.lastName.toUpperCase(),
    givenName: holder.firstName.toUpperCase(),
    serial: holder.cardSerial,
    birthDate: holder.dob,
    expiry: `${year}${month}`,
  }
}

/** Fixed-width field: space-padded, never longer. */
const fixed = (text: string, width: number): string => text.padEnd(width).slice(0, width)

/**
 * The PDF-417's text, in the three tracks the app's decoder demands: it rejects the whole code when
 * any track is malformed, and the scanner then never reads the card. `/device/barcodes` matches on
 * the serial and the birthdate, so the licence number, address and physical traits only need to be
 * well formed.
 *
 * Track 1 `%<province><city>^<surname>,$<given name>^<street>$<city line>^?`, track 2 `;<IIN><card
 * number>=<YYMM expiry><YYYYMMDD birth>=?`, track 3 a fixed 82 characters whose security field
 * (offset 70) zero-pads the serial.
 */
export function cardBackPayload({ surname, givenName, serial, birthDate, expiry }: CardBack): string {
  const track1 = `%BCVICTORIA^${surname},$${givenName}^910 GOVERNMENT ST$VICTORIA BC  ${POSTAL_CODE}^?`
  const track2 = `;6360282222222=${expiry}${birthDate}=?`
  const track3 =
    '_%0A' +
    fixed(POSTAL_CODE.replace(' ', ''), 11) +
    fixed('', 16) +
    'M180 80BRNBLU' +
    fixed('', 10) + // PHN: none on a licence
    fixed('', 16) +
    fixed(`00${serial}`, 11) +
    '?'
  return track1 + track2 + track3
}

/** Render the card back as a PNG, sized for `injectScanTarget` to centre on the camera frame as is. */
export async function renderCardBack(card: CardBack): Promise<Buffer> {
  const pdf417Options: Pdf417Options = {
    bcid: 'pdf417',
    text: cardBackPayload(card),
    scale: 6,
    columns: PDF417_COLUMNS,
    backgroundcolor: 'FFFFFF',
  }
  // Widened nearest-neighbour, as a smoothing kernel blurs bar edges, then squashed to a card-like
  // band: the squash changes the row height only, never the module width a read depends on.
  const widened = await sharp(await bwipjs.toBuffer(pdf417Options))
    .resize({ width: PDF417_WIDTH, kernel: 'nearest' })
    .toBuffer()
  const pdf417 = await sharp(widened).resize({ width: PDF417_WIDTH, height: PDF417_HEIGHT, fit: 'fill' }).toBuffer()
  // Never resampled: Code 39 has no checksum, so a bar merged by blurring reads as a shorter serial.
  const serialCode = await bwipjs.toBuffer({
    bcid: 'code39',
    text: card.serial,
    scale: 8,
    height: 10,
    backgroundcolor: 'FFFFFF',
  })
  const { width: serialWidth = 0 } = await sharp(serialCode).metadata()

  return sharp({
    create: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: serialCode, left: Math.round((CARD_WIDTH - serialWidth) / 2), top: Math.round(0.08 * CARD_HEIGHT) },
      {
        input: pdf417,
        left: Math.round((CARD_WIDTH - PDF417_WIDTH) / 2),
        top: CARD_HEIGHT - PDF417_HEIGHT - Math.round(0.06 * CARD_HEIGHT),
      },
    ])
    .png()
    .toBuffer()
}
