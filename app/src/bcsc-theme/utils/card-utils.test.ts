import { getCardProcessForCardType, isCardEvidenceComplete } from '@/bcsc-theme/utils/card-utils'
import { BCSCCardProcess, BCSCCardType } from 'react-native-bcsc-core'

describe('Card Utils', () => {
  describe('getCardProcessForCardType', () => {
    it('should return BCSC for Combined card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.ComboCard)).toBe(BCSCCardProcess.BCSCPhoto)
    })

    it('should return BCSC for Photo card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.PhotoCard)).toBe(BCSCCardProcess.BCSCPhoto)
    })

    it('should return BCSCNonPhoto for NonPhoto card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.NonPhotoCard)).toBe(BCSCCardProcess.BCSCNonPhoto)
    })

    it('should return NonBCSC for Other card type', () => {
      expect(getCardProcessForCardType(BCSCCardType.NonBcsc)).toBe(BCSCCardProcess.NonBCSC)
    })

    it('should return null for null card type', () => {
      expect(getCardProcessForCardType(null)).toBeNull()
    })

    it('should return null for unknown card type', () => {
      expect(getCardProcessForCardType(99 as any)).toBeNull()
    })

    it('should support all BCSCCardType values', () => {
      const cardTypes = Object.values(BCSCCardType)
      cardTypes.forEach((cardType) => {
        if (cardType === null) {
          expect(getCardProcessForCardType(cardType)).toBeNull()
        } else {
          const process = getCardProcessForCardType(cardType)
          expect(Object.values(BCSCCardProcess)).toContain(process)
        }
      })
    })
  })

  describe('isCardEvidenceComplete', () => {
    it('should return true for complete card evidence', () => {
      const completeCard = {
        evidenceType: { image_sides: ['front', 'back'] },
        documentNumber: '123456789',
        metadata: ['meta1', 'meta2'],
      }

      expect(isCardEvidenceComplete(completeCard as any)).toBe(true)
    })

    it('should return true for single-sided card evidence', () => {
      const completeCard = {
        evidenceType: { image_sides: ['front'] },
        documentNumber: '123456789',
        metadata: ['meta1'],
      }

      expect(isCardEvidenceComplete(completeCard as any)).toBe(true)
    })

    it('should return false when missing evidence type', () => {
      const incompleteCard = {
        documentNumber: '123456789',
        metadata: ['meta1', 'meta2'],
      }

      expect(isCardEvidenceComplete(incompleteCard as any)).toBe(false)
    })

    it('should return false when missing document number', () => {
      const incompleteCard = {
        evidenceType: { image_sides: ['front', 'back'] },
        metadata: ['meta1', 'meta2'],
      }

      expect(isCardEvidenceComplete(incompleteCard as any)).toBe(false)
    })

    it('should return false when metadata is incomplete', () => {
      const incompleteCard = {
        evidenceType: { image_sides: ['front', 'back'] },
        documentNumber: '123456789',
        metadata: ['meta1'],
      }

      expect(isCardEvidenceComplete(incompleteCard as any)).toBe(false)
    })

    it('should return false when card is undefined', () => {
      expect(isCardEvidenceComplete(undefined)).toBe(false)
    })
  })
})
