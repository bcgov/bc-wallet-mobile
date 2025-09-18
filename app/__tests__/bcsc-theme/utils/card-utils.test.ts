import { BCSCCardProcess, BCSCCardType } from '@/bcsc-theme/types/cards'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'

describe('Card Utils', () => {
  describe('getCardProcessForCardType', () => {
    it('should return BCSC for Combined card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.Combined)).toBe(BCSCCardProcess.BCSC)
    })

    it('should return BCSC for Photo card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.Photo)).toBe(BCSCCardProcess.BCSC)
    })

    it('should return BCSCNonPhoto for NonPhoto card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.NonPhoto)).toBe(BCSCCardProcess.BCSCNonPhoto)
    })

    it('should return NonBCSC for Other card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.Other)).toBe(BCSCCardProcess.NonBCSC)
    })

    it('should throw an error for None card type', () => {
      expect(() => getCardProcessForCardType(BCSCCardType.None)).toThrow(`Invalid card type: ${BCSCCardType.None}}`)
    })

    it('should throw an error for unknown card type', () => {
      expect(() => getCardProcessForCardType(99 as any)).toThrow('Unknown card type: 99')
    })

    it('should support all BCSCCardType values', () => {
      const cardTypes = Object.values(BCSCCardType)
      cardTypes.forEach((cardType) => {
        if (cardType === BCSCCardType.None) {
          expect(() => getCardProcessForCardType(cardType)).toThrow()
        } else {
          const process = getCardProcessForCardType(cardType)
          expect(Object.values(BCSCCardProcess)).toContain(process)
        }
      })
    })
  })
})
