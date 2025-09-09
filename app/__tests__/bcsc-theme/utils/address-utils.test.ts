import { isCanadianPostalCode } from '@/bcsc-theme/utils/address-utils'

describe('address-utils', () => {
  describe('isCanadianPostalCode', () => {
    it('should return true for valid postal codes', () => {
      expect(isCanadianPostalCode('A1B 2C3')).toBeTruthy()
      expect(isCanadianPostalCode('K1A 0B1')).toBeTruthy()
      expect(isCanadianPostalCode('V6B 1A1')).toBeTruthy()
      expect(isCanadianPostalCode('H2Y 1N4')).toBeTruthy()
      expect(isCanadianPostalCode('T5J 1N9')).toBeTruthy()
      expect(isCanadianPostalCode('R3C 4T3')).toBeTruthy()
      expect(isCanadianPostalCode('S7K 3J8')).toBeTruthy()
      expect(isCanadianPostalCode('Y1A 5B2')).toBeTruthy()
      expect(isCanadianPostalCode('X1A 2P3')).toBeTruthy()
      expect(isCanadianPostalCode('X0A 1H0')).toBeTruthy()
      expect(isCanadianPostalCode('B2H 3K4')).toBeTruthy()
      expect(isCanadianPostalCode('C1A 4N5')).toBeTruthy()
      expect(isCanadianPostalCode('E3B 5L6')).toBeTruthy()
      expect(isCanadianPostalCode('G1R 2X5')).toBeTruthy()
      expect(isCanadianPostalCode('M5V 3L9')).toBeTruthy()
      expect(isCanadianPostalCode('R2M 3S8')).toBeTruthy()
      expect(isCanadianPostalCode('S4P 2K5')).toBeTruthy()
      expect(isCanadianPostalCode('V5K 0A1')).toBeTruthy()
      expect(isCanadianPostalCode('Y1A 0A8')).toBeTruthy()
      expect(isCanadianPostalCode('X0B 1E0')).toBeTruthy()
      expect(isCanadianPostalCode('V8Z 1C8')).toBeTruthy()
    })

    it('should return true for valid postal codes without spaces', () => {
      expect(isCanadianPostalCode('A1B2C3')).toBeTruthy()
    })

    it('should return true for valid postal codes in lowercase', () => {
      expect(isCanadianPostalCode('a1b 2c3')).toBeTruthy()
    })

    it('should return true for valid postal codes in lowercase without spaces', () => {
      expect(isCanadianPostalCode('a1b2c3')).toBeTruthy()
    })

    it('should return true for valid postal codes with hyphens', () => {
      expect(isCanadianPostalCode('A1B-2C3')).toBeTruthy()
    })

    it('should return true for valid postal codes with any combination of casing, spaces and hyphens', () => {
      expect(isCanadianPostalCode('a1B-2c3')).toBeTruthy()
      expect(isCanadianPostalCode('A1b-2C3')).toBeTruthy()
      expect(isCanadianPostalCode('a1B 2c3')).toBeTruthy()
      expect(isCanadianPostalCode('A1b 2C3')).toBeTruthy()
      expect(isCanadianPostalCode('a1B2c3')).toBeTruthy()
      expect(isCanadianPostalCode('A1b2C3')).toBeTruthy()
    })

    it('should return false for invalid postal codes', () => {
      expect(isCanadianPostalCode('123 456')).toBeFalsy()
      expect(isCanadianPostalCode('ABC DEF')).toBeFalsy()
      expect(isCanadianPostalCode('A1B2C')).toBeFalsy()
      expect(isCanadianPostalCode('A1B 2C34')).toBeFalsy()
      expect(isCanadianPostalCode('A1B-2C34')).toBeFalsy()
      expect(isCanadianPostalCode('A1B_2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1 2C3')).toBeFalsy()
      expect(isCanadianPostalCode('1A1 2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A11 2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1A 22C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1A 2CC3')).toBeFalsy()
      expect(isCanadianPostalCode('A1A2C3 ')).toBeFalsy()
      expect(isCanadianPostalCode(' A1A2C3')).toBeFalsy()
      expect(isCanadianPostalCode('')).toBeFalsy()
      expect(isCanadianPostalCode(' ')).toBeFalsy()
      expect(isCanadianPostalCode('A B C D E F')).toBeFalsy()
      expect(isCanadianPostalCode('A-1B-2C-3')).toBeFalsy()
      expect(isCanadianPostalCode('A_1B_2C_3')).toBeFalsy()
      expect(isCanadianPostalCode('A1B@2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1B#2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1B$2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1B%2C3')).toBeFalsy()
      expect(isCanadianPostalCode('A1B^2C3')).toBeFalsy()
    })
  })
})
