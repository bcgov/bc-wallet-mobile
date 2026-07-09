import { formatAccountName, getNicknameValidationErrorKey } from '@/bcsc-theme/utils/account-utils'
import { BCState } from '@/store'

const createMockState = (nicknames: string[]): BCState =>
  ({
    bcsc: { nicknames },
  }) as unknown as BCState

describe('account-utils', () => {
  describe('getNicknameValidationErrorKey', () => {
    it('should return EmptyNameTitle when nickname is empty', () => {
      const state = createMockState([])

      expect(getNicknameValidationErrorKey(state, '')).toBe('BCSC.NicknameAccount.EmptyNameTitle')
    })

    it('should return CharCountTitle when nickname exceeds max length', () => {
      const state = createMockState([])
      const longName = 'a'.repeat(31)

      expect(getNicknameValidationErrorKey(state, longName)).toBe('BCSC.NicknameAccount.CharCountTitle')
    })

    it('should return null for a valid unique nickname', () => {
      const state = createMockState(['Alice'])

      expect(getNicknameValidationErrorKey(state, 'Bob')).toBeNull()
    })

    it('should return null for nickname at exactly max length', () => {
      const state = createMockState([])
      const maxName = 'a'.repeat(30)

      expect(getNicknameValidationErrorKey(state, maxName)).toBeNull()
    })

    it('should return null for single character nickname', () => {
      const state = createMockState([])

      expect(getNicknameValidationErrorKey(state, 'A')).toBeNull()
    })
  })

  describe('formatAccountName', () => {
    it('should return the formatted account name string with all parts', () => {
      const name = formatAccountName({
        firstName: 'Steve',
        middleNames: 'John',
        lastName: 'Brule',
      })

      expect(name).toBe('Brule, Steve John')
    })

    it('should return the formatted account name with multiple middle names', () => {
      const name = formatAccountName({
        firstName: 'Steve',
        middleNames: 'John Michael',
        lastName: 'Brule',
      })

      expect(name).toBe('Brule, Steve John Michael')
    })

    it('should return the formatted account name with middle names included in the first name', () => {
      const name = formatAccountName({
        firstName: 'Steve John',
        lastName: 'Brule',
      })

      expect(name).toBe('Brule, Steve John')

      const name2 = formatAccountName({
        firstName: 'Steve John Michael',
        lastName: 'Brule',
      })

      expect(name2).toBe('Brule, Steve John Michael')
    })

    it('should return the formatted account name with no middle names', () => {
      const name = formatAccountName({
        firstName: 'Steve',
        middleNames: '',
        lastName: 'Brule',
      })

      expect(name).toBe('Brule, Steve')

      const name2 = formatAccountName({
        firstName: 'Steve',
        lastName: 'Brule',
      })

      expect(name2).toBe('Brule, Steve')
    })

    it('should return the formatted account name with no first name', () => {
      const name = formatAccountName({
        middleNames: 'John',
        lastName: 'Brule',
      })

      expect(name).toBe('Brule, John')
    })

    it('should return the formatted account name with no last name', () => {
      const name = formatAccountName({
        firstName: 'Steve',
        middleNames: 'John',
      })

      expect(name).toBe('Steve John')
    })

    it('should return mononym when only one name is provided', () => {
      const name = formatAccountName({
        firstName: 'Steve',
      })

      expect(name).toBe('Steve')

      const name2 = formatAccountName({
        lastName: 'Brule',
      })

      expect(name2).toBe('Brule')

      const name3 = formatAccountName({
        middleNames: 'John',
      })

      expect(name3).toBe('John')
    })

    it('should return the formatted account name when only middle names are provided', () => {
      const name = formatAccountName({
        middleNames: 'John Michael',
      })

      expect(name).toBe('John Michael')
    })

    it('should return empty string when no names are provided', () => {
      const name = formatAccountName({})

      expect(name).toBe('')
    })
  })
})
