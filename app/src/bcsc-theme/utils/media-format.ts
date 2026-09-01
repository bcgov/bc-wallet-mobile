export type MediaKind = 'image' | 'document' | 'video'
export type MediaStage = 'metadata' | 'binary'
export type MediaFormat = 'image/jpeg' | 'image/heic' | 'image/png' | 'video/mp4' | 'video/quicktime'

// snake_case: these keys land verbatim as queryable log-body fields (same convention as
// report_id in @/utils/logger.ts).
export interface UploadLogContext {
  media_kind: MediaKind
  media_stage: MediaStage
  media_bytes?: number
  media_format?: MediaFormat
}

// ISO-BMFF (MP4/HEIC/QuickTime) major/compatible brands, mapped to the format they identify.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])
const MP4_BRANDS = new Set(['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1'])
const QUICKTIME_BRAND = 'qt  '

// Only the ftyp box header plus a handful of compatible-brand entries are ever inspected,
// regardless of what the box itself claims its size is.
const FTYP_SCAN_CAP_BYTES = 64

const readAscii4 = (bytes: Uint8Array, offset: number): string => {
  // Runs before every upload request is sent — a throw here would fail the upload itself, so an
  // out-of-range read yields "no match" instead.
  if (offset < 0 || offset + 4 > bytes.length) {
    return ''
  }
  return String.fromCodePoint(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
}

const brandToFormat = (brand: string): MediaFormat | undefined => {
  if (HEIC_BRANDS.has(brand)) {
    return 'image/heic'
  }
  if (brand === QUICKTIME_BRAND) {
    return 'video/quicktime'
  }
  if (MP4_BRANDS.has(brand)) {
    return 'video/mp4'
  }
  return undefined
}

// bytes is a `ftyp` box: [size(4)][type='ftyp'(4)][major_brand(4)][minor_version(4)][compatible_brands...(4 each)]
const classifyFtypBox = (bytes: Uint8Array): MediaFormat | undefined => {
  const majorBrand = readAscii4(bytes, 8)
  const fromMajorBrand = brandToFormat(majorBrand)
  if (fromMajorBrand) {
    return fromMajorBrand
  }

  // Some encoders name the real format only in the compatible-brands list, so scan it — bounded by
  // the box's declared size (big-endian uint32) and capped, since a bogus size must not overrun us.
  const declaredSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  const scanEnd = Math.min(bytes.length, declaredSize > 0 ? declaredSize : bytes.length, FTYP_SCAN_CAP_BYTES)

  for (let offset = 16; offset + 4 <= scanEnd; offset += 4) {
    const format = brandToFormat(readAscii4(bytes, offset))
    if (format) {
      return format
    }
  }

  return undefined
}

/**
 * Sniffs a media format from the file's actual magic bytes — never trust a declared
 * content-type, which can be wrong (e.g. VisionCamera's iOS front-camera capture can emit
 * HEIC while the caller labels it JPEG). Only the first ~64 bytes are inspected. Returns
 * undefined when the format can't be determined, so callers omit the field rather than log a
 * placeholder.
 */
export const sniffMediaFormat = (bytes: Uint8Array): MediaFormat | undefined => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (bytes.length >= 12 && readAscii4(bytes, 4) === 'ftyp') {
    return classifyFtypBox(bytes)
  }

  return undefined
}
