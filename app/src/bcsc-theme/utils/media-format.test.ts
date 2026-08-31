import { sniffMediaFormat } from './media-format'

const ascii4ToBytes = (value: string): number[] => [
  value.charCodeAt(0),
  value.charCodeAt(1),
  value.charCodeAt(2),
  value.charCodeAt(3),
]

const buildFtypBox = (majorBrand: string, compatibleBrands: string[] = []): Uint8Array => {
  const size = 16 + compatibleBrands.length * 4
  const bytes = [
    (size >>> 24) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 8) & 0xff,
    size & 0xff,
    ...ascii4ToBytes('ftyp'),
    ...ascii4ToBytes(majorBrand),
    0,
    0,
    0,
    0, // minor_version
    ...compatibleBrands.flatMap(ascii4ToBytes),
  ]
  return new Uint8Array(bytes)
}

describe('sniffMediaFormat', () => {
  it('detects JPEG from its magic bytes', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(sniffMediaFormat(bytes)).toBe('image/jpeg')
  })

  it('detects PNG from its magic bytes', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    expect(sniffMediaFormat(bytes)).toBe('image/png')
  })

  it('detects HEIC from the ftyp major brand', () => {
    expect(sniffMediaFormat(buildFtypBox('heic'))).toBe('image/heic')
  })

  it('detects QuickTime from the ftyp major brand', () => {
    expect(sniffMediaFormat(buildFtypBox('qt  '))).toBe('video/quicktime')
  })

  it('detects MP4 from the mp42 major brand', () => {
    expect(sniffMediaFormat(buildFtypBox('mp42'))).toBe('video/mp4')
  })

  it('detects MP4 from the isom major brand', () => {
    expect(sniffMediaFormat(buildFtypBox('isom'))).toBe('video/mp4')
  })

  it('falls back to the compatible-brands list when the major brand is unrecognized', () => {
    const bytes = buildFtypBox('mif1', ['msf1', 'heic'])
    expect(sniffMediaFormat(bytes)).toBe('image/heic')
  })

  it('returns undefined for garbage bytes', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c])
    expect(sniffMediaFormat(bytes)).toBeUndefined()
  })

  it('returns undefined for an empty buffer', () => {
    expect(sniffMediaFormat(new Uint8Array([]))).toBeUndefined()
  })

  it('returns undefined for a buffer too short for any signature check', () => {
    expect(sniffMediaFormat(new Uint8Array([0xff, 0xd8]))).toBeUndefined()
  })
})
