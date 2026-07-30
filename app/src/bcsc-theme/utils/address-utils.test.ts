import { formatAddressForDisplay } from '@/bcsc-theme/utils/address-utils'

describe('address-utils', () => {
  describe('formatAddressForDisplay', () => {
    it('should format address without streetAddress2', () => {
      const address = {
        streetAddress: '123 Main St',
        city: 'Victoria',
        province: 'BC',
        postalCode: 'V8W 1A1',
      }
      expect(formatAddressForDisplay(address)).toBe('123 MAIN ST, VICTORIA, BC V8W 1A1')
    })

    it('should format address with streetAddress2', () => {
      const address = {
        streetAddress: '123 Main St',
        streetAddress2: 'Suite 100',
        city: 'Victoria',
        province: 'BC',
        postalCode: 'V8W 1A1',
      }
      expect(formatAddressForDisplay(address)).toBe('123 MAIN ST, SUITE 100, VICTORIA, BC V8W 1A1')
    })

    it('should not include streetAddress2 when it is empty string', () => {
      const address = {
        streetAddress: '123 Main St',
        streetAddress2: '',
        city: 'Victoria',
        province: 'BC',
        postalCode: 'V8W 1A1',
      }
      expect(formatAddressForDisplay(address)).toBe('123 MAIN ST, VICTORIA, BC V8W 1A1')
    })
  })
})
