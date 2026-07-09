import {
  getCardProcessForCardType,
  isCardEvidenceComplete,
  isEvidenceAwaitingDocumentNumber,
} from '@/bcsc-theme/utils/card-utils'
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
    const twoSidedEvidenceType = { image_sides: [{}, {}] }
    const oneSidedEvidenceType = { image_sides: [{}] }

    it('should return true for complete two-sided card evidence (e.g. drivers licence)', () => {
      const completeCard = {
        evidenceType: twoSidedEvidenceType,
        documentNumber: '123456789',
        metadata: ['meta1', 'meta2'],
      }

      expect(isCardEvidenceComplete(completeCard as any)).toBe(true)
    })

    it('should return true for complete one-sided card evidence (e.g. passport)', () => {
      const completeCard = {
        evidenceType: oneSidedEvidenceType,
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
        evidenceType: twoSidedEvidenceType,
        metadata: ['meta1', 'meta2'],
      }

      expect(isCardEvidenceComplete(incompleteCard as any)).toBe(false)
    })

    it('should return false when a two-sided card only has one photo', () => {
      const incompleteCard = {
        evidenceType: twoSidedEvidenceType,
        documentNumber: '123456789',
        metadata: ['meta1'],
      }

      expect(isCardEvidenceComplete(incompleteCard as any)).toBe(false)
    })

    it('should return false when card is undefined', () => {
      expect(isCardEvidenceComplete(undefined)).toBe(false)
    })
  })

  describe('isEvidenceAwaitingDocumentNumber', () => {
    const twoSidedEvidenceType = { image_sides: [{}, {}] }
    const oneSidedEvidenceType = { image_sides: [{}] }

    it('should return true when all photos are captured but the document number is missing', () => {
      const inProgressCard = {
        evidenceType: twoSidedEvidenceType,
        metadata: ['meta1', 'meta2'],
      }

      expect(isEvidenceAwaitingDocumentNumber(inProgressCard as any)).toBe(true)
    })

    it('should return true for a one-sided card with its photo captured and no document number', () => {
      const inProgressCard = {
        evidenceType: oneSidedEvidenceType,
        metadata: ['meta1'],
      }

      expect(isEvidenceAwaitingDocumentNumber(inProgressCard as any)).toBe(true)
    })

    it('should return false once the document number has been entered (evidence complete)', () => {
      const completeCard = {
        evidenceType: twoSidedEvidenceType,
        documentNumber: '123456789',
        metadata: ['meta1', 'meta2'],
      }

      expect(isEvidenceAwaitingDocumentNumber(completeCard as any)).toBe(false)
    })

    it('should return false for an abandoned selection with no photos', () => {
      const abandonedCard = {
        evidenceType: twoSidedEvidenceType,
        metadata: [],
      }

      expect(isEvidenceAwaitingDocumentNumber(abandonedCard as any)).toBe(false)
    })

    it('should return false when a two-sided card only has one photo captured', () => {
      const partialCard = {
        evidenceType: twoSidedEvidenceType,
        metadata: ['meta1'],
      }

      expect(isEvidenceAwaitingDocumentNumber(partialCard as any)).toBe(false)
    })

    it('should return false when missing evidence type', () => {
      const noTypeCard = {
        metadata: ['meta1', 'meta2'],
      }

      expect(isEvidenceAwaitingDocumentNumber(noTypeCard as any)).toBe(false)
    })

    it('should return false when card is undefined', () => {
      expect(isEvidenceAwaitingDocumentNumber(undefined)).toBe(false)
    })
  })
})
