import {
  BC_BCID_BARCODE_Y,
  BC_BCSC_BARCODE_C,
  BC_COMBO_BARCODE_K,
  BC_DL_BARCODE_NO_DCN_A,
  BC_DL_BARCODE_S,
} from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { decodeCardBarcode, ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { CardScan, combineCardBarcodes, EMPTY_CARD_SCAN } from '@/bcsc-theme/utils/card-scan'

const read = (code: ScanableCode) => decodeCardBarcode(code)

const serialRead = read({ type: 'code-39', value: 'K12345678' })
const otherSerialRead = read({ type: 'code-128', value: 'A06198657' })
const licenceRead = read({ type: 'pdf-417', value: BC_DL_BARCODE_S })
const noDcnLicenceRead = read({ type: 'pdf-417', value: BC_DL_BARCODE_NO_DCN_A })

describe('combineCardBarcodes', () => {
  it('sets only the serial for a 1D read', () => {
    expect(combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead])).toEqual({ serial: 'K12345678', card: null })
  })

  it('sets only the card for a PDF-417 read', () => {
    expect(combineCardBarcodes(EMPTY_CARD_SCAN, [licenceRead])).toEqual({
      serial: null,
      card: expect.objectContaining({ dcn: 'S00023254' }),
    })
  })

  it('gives the same scan for a 1D and a PDF-417 in either order', () => {
    const serialFirst = combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, licenceRead])
    const cardFirst = combineCardBarcodes(EMPTY_CARD_SCAN, [licenceRead, serialRead])

    expect(serialFirst).toEqual(cardFirst)
    expect(serialFirst.serial).toBe('K12345678')
    expect(serialFirst.card).not.toBeNull()
  })

  it.each([
    ['S', BC_DL_BARCODE_S, 'S00023254'],
    ['C', BC_BCSC_BARCODE_C, 'C00015303'],
    ['K', BC_COMBO_BARCODE_K, 'K00023254'],
    ['Y', BC_BCID_BARCODE_Y, 'Y00023254'],
  ])('leaves the serial empty for a %s-prefixed PDF-417 and keeps its DCN on the card', (_, barcode, dcn) => {
    const scan = combineCardBarcodes(EMPTY_CARD_SCAN, [read({ type: 'pdf-417', value: barcode })])

    expect(scan.serial).toBeNull()
    expect(scan.card?.dcn).toBe(dcn)
  })

  it('keeps what earlier calls captured across a batch of only failures', () => {
    const afterSerial = combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead])
    const afterFailures = combineCardBarcodes(afterSerial, [
      read({ type: 'qr-code', value: 'A12345678' }),
      read({ type: 'code-39', value: '123456789' }),
    ])
    const afterCard = combineCardBarcodes(afterFailures, [licenceRead])

    expect(afterFailures).toEqual(afterSerial)
    expect(afterCard.serial).toBe('K12345678')
    expect(afterCard.card).not.toBeNull()
  })

  describe('failed reads', () => {
    const failures: [string, ScanableCode][] = [
      ['a damaged PDF-417', { type: 'pdf-417', value: BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?') }],
      [
        'an AAMVA PDF-417',
        { type: 'pdf-417', value: '@\n\u001e\rANSI 636028090002DL00410278ZV03190008DLDAQ1234567\n' },
      ],
      ['a code-39 of digits only', { type: 'code-39', value: '123456789' }],
      ['a code-39 with no value', { type: 'code-39' }],
      ['a QR code', { type: 'qr-code', value: 'A12345678' }],
    ]

    it.each(failures)('leaves an empty scan empty for %s', (_, code) => {
      expect(combineCardBarcodes(EMPTY_CARD_SCAN, [read(code)])).toEqual(EMPTY_CARD_SCAN)
    })

    it.each(failures)('leaves a captured scan unchanged for %s', (_, code) => {
      const captured = combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, licenceRead])

      expect(combineCardBarcodes(captured, [read(code)])).toEqual(captured)
    })
  })

  describe('latest read wins', () => {
    it('replaces the serial with a later 1D read', () => {
      expect(combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, otherSerialRead]).serial).toBe('A06198657')
    })

    it('replaces the card with a later PDF-417 and keeps the serial', () => {
      const scan = combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, licenceRead, noDcnLicenceRead])

      expect(scan.serial).toBe('K12345678')
      expect(scan.card?.dcn).toBeNull()
    })
  })

  describe('purity', () => {
    it('never mutates the previous scan', () => {
      const previous: CardScan = Object.freeze({ serial: 'K12345678', card: null })

      const next = combineCardBarcodes(previous, [otherSerialRead, licenceRead])

      expect(previous).toEqual({ serial: 'K12345678', card: null })
      expect(next).not.toBe(previous)
    })

    it('leaves the shared empty scan empty', () => {
      combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, licenceRead])

      expect(EMPTY_CARD_SCAN).toEqual({ serial: null, card: null })
    })

    it('returns an equal scan for no reads', () => {
      const previous = combineCardBarcodes(EMPTY_CARD_SCAN, [serialRead, licenceRead])

      expect(combineCardBarcodes(previous, [])).toEqual(previous)
      expect(combineCardBarcodes(EMPTY_CARD_SCAN, [])).toEqual(EMPTY_CARD_SCAN)
    })
  })
})
