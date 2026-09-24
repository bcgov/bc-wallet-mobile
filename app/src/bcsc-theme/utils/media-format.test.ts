import { normalizeMp4MajorBrand, sniffMediaFormat } from './media-format'

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
    const bytes = buildFtypBox('wxyz', ['zzzz', 'heic'])
    expect(sniffMediaFormat(bytes)).toBe('image/heic')
  })

  it('returns undefined when neither the major brand nor any compatible brand is recognized', () => {
    expect(sniffMediaFormat(buildFtypBox('wxyz', ['zzzz', 'yyyy']))).toBeUndefined()
  })

  it('does not label a non-HEVC HEIF (e.g. AVIF) as HEIC via the structural brands', () => {
    expect(sniffMediaFormat(buildFtypBox('avif', ['mif1', 'miaf']))).toBeUndefined()
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

describe('normalizeMp4MajorBrand', () => {
  const majorBrandOf = (bytes: Uint8Array) => String.fromCodePoint(...bytes.slice(8, 12))

  it('rewrites an isom major brand to mp42 in place and returns the original brand', () => {
    // Header written by VisionCamera v5 / Media3 on Android
    const bytes = buildFtypBox('isom', ['isom', 'iso2', 'mp41'])
    const before = Array.from(bytes)

    expect(normalizeMp4MajorBrand(bytes)).toBe('isom')
    expect(majorBrandOf(bytes)).toBe('mp42')
    expect(sniffMediaFormat(bytes)).toBe('video/mp4')
    // Only the 4 major-brand bytes change
    const changed = Array.from(bytes).flatMap((b, i) => (b === before[i] ? [] : [i]))
    expect(changed).toEqual([8, 9, 10, 11])
  })

  it.each(['iso2', 'iso4', 'iso5', 'iso6', 'avc1'])('rewrites the %s MP4 brand', (brand) => {
    const bytes = buildFtypBox(brand)

    expect(normalizeMp4MajorBrand(bytes)).toBe(brand)
    expect(majorBrandOf(bytes)).toBe('mp42')
  })

  it.each(['mp42', 'mp41'])('leaves an already-accepted %s brand alone', (brand) => {
    const bytes = buildFtypBox(brand, ['isom'])
    const before = Array.from(bytes)

    expect(normalizeMp4MajorBrand(bytes)).toBeUndefined()
    expect(Array.from(bytes)).toEqual(before)
  })

  it.each([
    ['QuickTime', 'qt  '],
    ['HEIC', 'heic'],
    ['an unknown brand', 'abcd'],
  ])('leaves %s alone', (_label, brand) => {
    const bytes = buildFtypBox(brand)
    const before = Array.from(bytes)

    expect(normalizeMp4MajorBrand(bytes)).toBeUndefined()
    expect(Array.from(bytes)).toEqual(before)
  })

  it('leaves non-ftyp input and short buffers alone', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    const short = new Uint8Array([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f])

    expect(normalizeMp4MajorBrand(jpeg)).toBeUndefined()
    expect(normalizeMp4MajorBrand(short)).toBeUndefined()
    expect(Array.from(short.slice(8))).toEqual([0x69, 0x73, 0x6f])
  })
})
