import { getNicknameValidationErrorKey, hasNickname } from '@/bcsc-theme/utils/account-utils'
import { BCState } from '@/store'

const createMockState = (nicknames: string[]): BCState =>
  ({
    bcsc: { nicknames },
  }) as unknown as BCState

describe('account-utils', () => {
  describe('hasNickname', () => {
    it('should return true when nickname exists in state', () => {
      const state = createMockState(['Alice', 'Bob'])

      expect(hasNickname(state, 'Alice')).toBe(true)
    })

    it('should return false when nickname does not exist in state', () => {
      const state = createMockState(['Alice', 'Bob'])

      expect(hasNickname(state, 'Charlie')).toBe(false)
    })

    it('should return false when nicknames list is empty', () => {
      const state = createMockState([])

      expect(hasNickname(state, 'Alice')).toBe(false)
    })
  })

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

    it('should return NameAlreadyExists when nickname is a duplicate', () => {
      const state = createMockState(['Alice'])

      expect(getNicknameValidationErrorKey(state, 'Alice')).toBe('BCSC.NicknameAccount.NameAlreadyExists')
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
})
