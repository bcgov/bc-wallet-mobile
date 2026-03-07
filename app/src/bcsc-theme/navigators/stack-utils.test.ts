import { BCSCStacks } from '../types/navigators'
import { getBaseScreenName } from './stack-utils'

describe('StackUtils', () => {
  describe('getBaseScreenName', () => {
    it('returns the screen name', () => {
      expect(getBaseScreenName('OnboardingAccountSetup')).toBe('OnboardingAccountSetup')
    })

    it('returns the base screen with the stack prefix removed and trimmed', () => {
      expect(getBaseScreenName(`${BCSCStacks.Main}Test`)).toBe('Test')
      expect(getBaseScreenName(`${BCSCStacks.Main} Test`)).toBe('Test')
    })

    it('handles empty string', () => {
      expect(getBaseScreenName('')).toBe('')
    })
  })
})
