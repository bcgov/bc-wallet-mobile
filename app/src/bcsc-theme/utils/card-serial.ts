/**
 * Parses a Document Control Number (the card serial number) from the 1D barcode or from the 2D
 * barcode's 11-character security field, which zero-pads the 9-character DCN.
 *
 * @returns the 9-character DCN, or null when the value is not one.
 */
export const parseDcn = (raw: string): string | null => {
  // B, D, I, O, Q and V are never used, as they don't laser-engrave legibly. The check digit isn't
  // validated: the spec says Modulus 10, but real cards satisfy no common variant.
  const match = /^0*([ACE-HJ-NPR-UW-Z]\d{8})$/.exec(raw.trim())

  return match ? match[1] : null
}

/**
 * The 1D (Code 39 / Code 128) serial check: letters then digits, at most 9 characters. Looser than {@link parseDcn}.
 *
 * @returns the value unchanged, or null when it does not match.
 */
export const parseLooseSerial = (raw: string): string | null => {
  return /^[A-Za-z]+\d+$/.test(raw) && raw.length <= 9 ? raw : null
}

const normalizeSerial = (raw?: string | null): string => {
  const upper = raw?.trim().toUpperCase() ?? ''

  return parseDcn(upper) ?? upper
}

/**
 * Whether two serials name the same card. A serial reaches the app in more than one shape — the 1D
 * barcode's raw value, the 2D barcode's zero-padded DCN, or typed by hand in either case — so each is
 * reduced to its DCN when it is one, and to its trimmed upper-case form otherwise.
 *
 * @returns false when either serial is missing.
 */
export const isSameCardSerial = (a?: string | null, b?: string | null): boolean => {
  const left = normalizeSerial(a)
  const right = normalizeSerial(b)

  return left !== '' && left === right
}
