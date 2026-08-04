import { renderHook } from '@testing-library/react-native'
import useEvidenceIDCollectionModel, { EvidenceCollectionFormState } from './useEvidenceIDCollectionModel'

// Minimal translation stub: echo the key back so we can assert on which error fired.
const t = (key: string) => key

// A valid baseline submission with a populated last name but an empty first name (a mononym).
const baseValues: EvidenceCollectionFormState = {
  documentNumber: '123456789',
  firstName: '',
  lastName: 'Mononym',
  middleNames: '',
  birthDate: '1990/01/01',
}

describe('useEvidenceIDCollectionModel', () => {
  const getValidateEvidence = () => {
    const { result } = renderHook(() => useEvidenceIDCollectionModel())
    return result.current.validateEvidence
  }

  describe('validateEvidence', () => {
    it('does not require a first name so mononyms can proceed', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: { ...baseValues, firstName: '' },
        personalInfoRequired: true,
        minimumAge: 19,
        t,
      })

      expect(errors.firstName).toBeUndefined()
      expect(errors).toEqual({})
    })

    it('still requires a last name', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: { ...baseValues, firstName: '', lastName: '' },
        personalInfoRequired: true,
        minimumAge: 19,
        t,
      })

      expect(errors.lastName).toBe('BCSC.EvidenceIDCollection.LastNameError')
    })

    it('treats a whitespace-only last name as missing', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: { ...baseValues, lastName: '   ' },
        personalInfoRequired: true,
        minimumAge: 19,
        t,
      })

      expect(errors.lastName).toBe('BCSC.EvidenceIDCollection.LastNameError')
    })

    it('enforces the per-field name lengths carried over from ias-ios', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: {
          ...baseValues,
          firstName: 'A'.repeat(16),
          lastName: 'B'.repeat(36),
          middleNames: 'C'.repeat(31),
        },
        personalInfoRequired: true,
        minimumAge: 19,
        t,
      })

      expect(errors.firstName).toBe('BCSC.EvidenceIDCollection.FirstNameLengthError')
      expect(errors.lastName).toBe('BCSC.EvidenceIDCollection.LastNameLengthError')
      expect(errors.middleNames).toBe('BCSC.EvidenceIDCollection.MiddleNamesLengthError')
    })

    it('accepts names at the length limits', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: {
          ...baseValues,
          firstName: 'A'.repeat(15),
          lastName: 'B'.repeat(35),
          middleNames: 'C'.repeat(30),
        },
        personalInfoRequired: true,
        minimumAge: 19,
        t,
      })

      expect(errors).toEqual({})
    })

    it('skips personal info validation entirely when not required', () => {
      const validateEvidence = getValidateEvidence()

      const errors = validateEvidence({
        values: { documentNumber: '', firstName: '', lastName: '', middleNames: '', birthDate: '' },
        personalInfoRequired: false,
        minimumAge: 19,
        t,
      })

      expect(errors).toEqual({})
    })
  })
})
