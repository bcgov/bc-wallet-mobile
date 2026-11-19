/**
 * The card back a scan journey photographs (src/helpers/card-back.ts): what its two codes carry, and
 * that both read back off the frame as it is injected. The reader is zxing, not the app's scanner, so
 * the PDF-417's text is checked against the track grammar the app's decoder enforces. Every value is
 * made up.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import { TestUsers } from '../src/constants.ts'
import { composeScanTarget } from '../src/helpers/camera.ts'
import { cardBackOf, cardBackPayload, renderCardBack } from '../src/helpers/card-back.ts'

// The reader's binary, from the package: left alone it is fetched from a CDN.
prepareZXingModule({
  overrides: { wasmBinary: readFileSync(fileURLToPath(import.meta.resolve('zxing-wasm/reader/zxing_reader.wasm'))) },
})

const NOW = new Date('2026-11-13T12:00:00Z')

/** A card holder as a mint shapes one. */
const MINTED = {
  flow: 'photo',
  username: 'e2e_shaggy',
  firstName: 'SHAGGY',
  lastName: 'AUTOTESTQWERTYUI',
  dob: '19981114',
  cardSerial: 'C00000001',
  cardScanImage: 'images/dl_shaggy.jpg',
  selfieImage: 'images/id_shaggy.jpg',
}

// --- the app decoder's track grammar ----------------------------------------------------------------

// Restated from app/src/bcsc-theme/utils/bc-card-barcode.ts, which is another Yarn project's.
// Track 1: %<province><city, 13 at most>^<surname>,$<given names, 35 at most with the surname>^<address lines>^?
const TRACK_1 = /^%(?<province>[A-Z]{2})(?<city>[^^?]{1,13})\^(?<name>[^^?]{1,35})\^(?<address>[^?]*?)\^?\?/
// Track 2: ;<IIN><card number, 13 at most>=<expiry YYMM><birth YYYYMMDD><overflow, 1 to 5>?
const TRACK_2 = /^;(?<iin>\d{6})(?<cardNumber>\d{1,13})=(?<expiry>\d{4})(?<birthDate>\d{8})[^?]{1,5}\?/
// Track 3: 82 characters from `_%` to `?`, every field at a fixed offset.
const TRACK_3_LENGTH = 82
const TRACK_3 = { postalCode: [4, 15], sex: [31, 32], height: [32, 35], phn: [44, 54], security: [70, 81] }
// The security field zero-pads the serial, whose letter is never B, D, I, O, Q or V.
const SERIAL_IN_SECURITY_FIELD = /^0*([ACE-HJ-NPR-UW-Z]\d{8})$/

const within = (digits, low, high) => Number(digits) >= low && Number(digits) <= high

/** Take a PDF-417's text apart the way the app's decoder does. Fails on anything that decoder rejects. */
function readTracks(text) {
  const track1 = TRACK_1.exec(text)
  assert.ok(track1, 'track 1 is malformed')
  const track2 = TRACK_2.exec(text.slice(track1[0].length))
  assert.ok(track2, 'track 2 is malformed')
  const { expiry, birthDate } = track2.groups
  assert.ok(within(expiry.slice(2), 1, 12), 'track 2 expires in no such month')
  assert.ok(within(birthDate.slice(4, 6), 1, 12) && within(birthDate.slice(6), 1, 31), 'track 2 holds no such birthdate')
  const track3 = text.slice(track1[0].length + track2[0].length)
  assert.equal(track3.length, TRACK_3_LENGTH, 'track 3 is not 82 characters')
  assert.ok(track3.startsWith('_%') && track3.endsWith('?'), 'track 3 lacks a sentinel')

  const field = ([start, end]) => track3.slice(start, end).trim()
  const [surname, ...givenNames] = track1.groups.name.split('$')
  return {
    province: track1.groups.province,
    city: track1.groups.city,
    surname: surname.replace(/,$/, ''),
    givenNames: givenNames.join(' '),
    addressLines: track1.groups.address.split('$'),
    iin: track2.groups.iin,
    cardNumber: track2.groups.cardNumber,
    expiry,
    birthDate,
    postalCode: field(TRACK_3.postalCode),
    sex: field(TRACK_3.sex),
    heightCm: field(TRACK_3.height),
    phn: field(TRACK_3.phn),
    serial: SERIAL_IN_SECURITY_FIELD.exec(field(TRACK_3.security))?.[1],
  }
}

/** Every Code 39 and PDF-417 on a base64 PNG, as `{ format: text }`. */
async function readCodes(base64Png) {
  const codes = await readBarcodes(Buffer.from(base64Png, 'base64'), { formats: ['Code39', 'PDF417'], tryHarder: true })
  assert.deepEqual(codes.map((code) => code.format).sort(), ['Code39', 'PDF417'])
  return Object.fromEntries(codes.map((code) => [code.format, code.text]))
}

// --- whose card -------------------------------------------------------------------------------------

test('a card back carries the serial, name and birthdate of its holder, and expires five years on', () => {
  assert.deepEqual(cardBackOf(MINTED, NOW), {
    surname: 'AUTOTESTQWERTYUI',
    givenName: 'SHAGGY',
    serial: 'C00000001',
    birthDate: '19981114',
    expiry: '3111',
  })
  // A persona's names are printed as a card prints them.
  const persona = cardBackOf(TestUsers.combined, new Date('2027-01-05T00:00:00Z'))
  assert.deepEqual(
    { ...persona, serial: '<serial>' },
    { surname: 'DINKLEY', givenName: 'VELMA', serial: '<serial>', birthDate: '19951217', expiry: '3201' }
  )
  assert.equal(persona.serial, TestUsers.combined.cardSerial)
})

test('a holder without a card has no card back', () => {
  assert.throws(() => cardBackOf(TestUsers.na, NOW), /has no card back to scan/)
})

// --- what the codes carry ---------------------------------------------------------------------------

test('the payload is the three tracks the app decoder reads, with the serial in the security field', () => {
  const payload = cardBackPayload(cardBackOf(MINTED, NOW))

  assert.deepEqual(readTracks(payload), {
    province: 'BC',
    city: 'VICTORIA',
    surname: 'AUTOTESTQWERTYUI',
    givenNames: 'SHAGGY',
    addressLines: ['910 GOVERNMENT ST', 'VICTORIA BC  V8W 3Y8'],
    iin: '636028',
    cardNumber: '2222222',
    expiry: '3111',
    birthDate: '19981114',
    postalCode: 'V8W3Y8',
    sex: 'M',
    heightCm: '180',
    phn: '',
    serial: 'C00000001',
  })
})

test('both codes read back off the injected frame: the serial, and the payload whole', async () => {
  for (const holder of [MINTED, TestUsers.photo, TestUsers.combined, TestUsers.nonPhoto]) {
    const card = cardBackOf(holder, NOW)
    const codes = await readCodes(await composeScanTarget(await renderCardBack(card)))

    assert.equal(codes.Code39, card.serial)
    assert.equal(codes.PDF417, cardBackPayload(card))
    const tracks = readTracks(codes.PDF417)
    assert.deepEqual(
      [tracks.surname, tracks.givenNames, tracks.birthDate, tracks.serial],
      [card.surname, card.givenName, card.birthDate, card.serial]
    )
  }
})
