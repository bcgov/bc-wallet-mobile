/**
 * Characters used to build a user-facing reference code. Visually ambiguous
 * glyphs (0/O, 1/I/L, and U) are excluded so the code can be read aloud over the
 * phone and typed back without confusion.
 */
const REFERENCE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const REFERENCE_CODE_LENGTH = 8
const REFERENCE_CODE_GROUP_SIZE = 4

/**
 * Generates a short, human-readable reference code, e.g. "7K2P-9XQF".
 *
 * It is grouped with a dash for readability and drawn from an ambiguity-free
 * alphabet so a user can relay it to support without transcription errors.
 */
export const generateReferenceCode = (): string => {
  let code = ''
  for (let i = 0; i < REFERENCE_CODE_LENGTH; i++) {
    if (i > 0 && i % REFERENCE_CODE_GROUP_SIZE === 0) {
      code += '-'
    }
    code += REFERENCE_CODE_ALPHABET.charAt(Math.floor(Math.random() * REFERENCE_CODE_ALPHABET.length))
  }
  return code
}
