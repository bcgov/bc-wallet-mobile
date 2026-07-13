import {
  clampEvidenceImagesToSides,
  getCardProcessForCardType,
  isCardEvidenceComplete,
  isEvidenceAwaitingDocumentNumber,
  isEvidenceCaptureIncomplete,
  normalizeEvidenceImageLabel,
} from '@/bcsc-theme/utils/card-utils'
import { BCSCCardProcess, BCSCCardType, EvidenceImageSide, PhotoMetadata } from 'react-native-bcsc-core'

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

  describe('normalizeEvidenceImageLabel', () => {
    it('maps legacy lowercase "front" to FRONT_SIDE', () => {
      expect(normalizeEvidenceImageLabel('front')).toBe('FRONT_SIDE')
    })

    it('maps legacy lowercase "back" to BACK_SIDE', () => {
      expect(normalizeEvidenceImageLabel('back')).toBe('BACK_SIDE')
    })

    it('returns an already-normalized label unchanged', () => {
      expect(normalizeEvidenceImageLabel('FRONT_SIDE')).toBe('FRONT_SIDE')
    })

    it('returns an unrelated label unchanged', () => {
      expect(normalizeEvidenceImageLabel('PASSPORT')).toBe('PASSPORT')
    })
  })

  describe('clampEvidenceImagesToSides', () => {
    const photo = (label: string, tag: string): PhotoMetadata => ({
      label,
      content_type: 'image/jpeg',
      content_length: 1,
      date: 0,
      sha256: tag,
      file_path: `/tmp/${tag}.jpg`,
    })
    const sides = (count: number): EvidenceImageSide[] =>
      Array.from({ length: count }, (_, i) => ({
        image_side_name: i === 0 ? 'FRONT_SIDE' : 'BACK_SIDE',
        image_side_label: `side-${i}`,
        image_side_tip: `tip-${i}`,
      }))

    it('dedupes an over-count two-sided card, keeping the last occurrence of the duplicated label', () => {
      // Mirrors the BCDL 2->3 dead end: retake on the back side leaves a stale
      // duplicate appended after the original two.
      const metadata = [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back'), photo('BACK_SIDE', "back'")]

      const result = clampEvidenceImagesToSides(metadata, sides(2))

      expect(result).toEqual([photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', "back'")])
    })

    it('dedupes an over-count single-sided card down to the last occurrence', () => {
      // Mirrors the passport 1->2 dead end: re-accepting the only side appends
      // a duplicate instead of replacing it.
      const metadata = [photo('PASSPORT', 'p'), photo('PASSPORT', "p'")]

      const result = clampEvidenceImagesToSides(metadata, sides(1))

      expect(result).toEqual([photo('PASSPORT', "p'")])
    })

    it('returns exact-count metadata unchanged', () => {
      const metadata = [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back')]

      expect(clampEvidenceImagesToSides(metadata, sides(2))).toBe(metadata)
    })

    it('dedupes mixed legacy and normalized labels referring to the same sides', () => {
      const metadata = [photo('front', 'a'), photo('BACK_SIDE', 'b'), photo('back', 'c')]

      const result = clampEvidenceImagesToSides(metadata, sides(2))

      expect(result).toHaveLength(2)
      expect(result.map((r) => normalizeEvidenceImageLabel(r.label))).toEqual(['FRONT_SIDE', 'BACK_SIDE'])
    })

    it('returns metadata unchanged when imageSides is undefined', () => {
      const metadata = [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back'), photo('BACK_SIDE', "back'")]

      expect(clampEvidenceImagesToSides(metadata, undefined)).toBe(metadata)
    })

    it('returns metadata unchanged when imageSides is empty', () => {
      const metadata = [photo('FRONT_SIDE', 'front'), photo('BACK_SIDE', 'back'), photo('BACK_SIDE', "back'")]

      expect(clampEvidenceImagesToSides(metadata, [])).toBe(metadata)
    })

    it('slices an over-count card with all-distinct labels down to the expected count', () => {
      const metadata = [photo('A', 'a'), photo('B', 'b'), photo('C', 'c')]

      const result = clampEvidenceImagesToSides(metadata, sides(2))

      expect(result).toEqual([photo('A', 'a'), photo('B', 'b')])
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

  describe('isEvidenceCaptureIncomplete', () => {
    const twoSidedEvidenceType = { image_sides: [{}, {}] }
    const oneSidedEvidenceType = { image_sides: [{}] }

    it('should return true when a two-sided card has only its first photo captured', () => {
      const partialCard = {
        evidenceType: twoSidedEvidenceType,
        metadata: ['meta1'],
      }

      expect(isEvidenceCaptureIncomplete(partialCard as any)).toBe(true)
    })

    it('should return true for a selected card with no photos captured yet', () => {
      const selectedCard = {
        evidenceType: twoSidedEvidenceType,
        metadata: [],
      }

      expect(isEvidenceCaptureIncomplete(selectedCard as any)).toBe(true)
    })

    it('should return false when all required photos are captured (awaiting document number)', () => {
      const allCaptured = {
        evidenceType: twoSidedEvidenceType,
        metadata: ['meta1', 'meta2'],
      }

      expect(isEvidenceCaptureIncomplete(allCaptured as any)).toBe(false)
    })

    it('should return false for a one-sided card with its only photo captured', () => {
      const oneSidedCaptured = {
        evidenceType: oneSidedEvidenceType,
        metadata: ['meta1'],
      }

      expect(isEvidenceCaptureIncomplete(oneSidedCaptured as any)).toBe(false)
    })

    it('should return false once the document number has been entered', () => {
      const withDocNumber = {
        evidenceType: twoSidedEvidenceType,
        documentNumber: '123456789',
        metadata: ['meta1'],
      }

      expect(isEvidenceCaptureIncomplete(withDocNumber as any)).toBe(false)
    })

    it('should return false when missing evidence type', () => {
      const noTypeCard = {
        metadata: [],
      }

      expect(isEvidenceCaptureIncomplete(noTypeCard as any)).toBe(false)
    })

    it('should return false when card is undefined', () => {
      expect(isEvidenceCaptureIncomplete(undefined)).toBe(false)
    })
  })
})
