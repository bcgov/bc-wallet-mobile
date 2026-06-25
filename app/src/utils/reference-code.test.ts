import { generateReferenceCode } from './reference-code'

// Matches the ambiguity-free alphabet used by generateReferenceCode
// (digits 2-9 and A-Z excluding I, L, O, U), grouped as XXXX-XXXX.
const REFERENCE_CODE_PATTERN = /^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/

describe('generateReferenceCode', () => {
  it('produces a grouped, ambiguity-free code', () => {
    for (let i = 0; i < 100; i++) {
      const codeValue = generateReferenceCode()
      expect(codeValue).toMatch(REFERENCE_CODE_PATTERN)
      // No easily-confused glyphs (0/O, 1/I/L, U)
      expect(codeValue).not.toMatch(/[01ILOU]/)
    }
  })

  it('returns a fresh code on each call', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferenceCode()))
    expect(codes.size).toBe(20)
  })
})
