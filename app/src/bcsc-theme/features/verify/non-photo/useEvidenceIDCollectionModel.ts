import moment from 'moment'
import { useCallback } from 'react'

export type EvidenceCollectionFormState = {
  documentNumber: string
  firstName: string
  lastName: string
  middleNames: string
  birthDate: string
}

export type EvidenceCollectionFormErrors = Partial<EvidenceCollectionFormState>

type TranslationFn = (key: string, options?: { minimumAge: number }) => string

const useEvidenceIDCollectionModel = () => {
  // Convert date from YYYY/MM/DD -> YYYY-MM-DD
  const toCanonicalBirthDate = useCallback((value: string): string => value.split('/').join('-'), [])

  const isCanonicalBirthDateValid = useCallback((value: string): boolean => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
    if (!regex.test(value)) {
      return false
    }

    const [year, month, day] = value.split('-').map(Number)
    const parsedDate = new Date(year, month - 1, day)

    return parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day
  }, [])

  const isOfMinimumAge = useCallback((canonicalBirthDate: string, minimumAge: number): boolean => {
    return moment().diff(moment(canonicalBirthDate, 'YYYY-MM-DD', true), 'years') >= minimumAge
  }, [])

  const isDocumentNumberValid = useCallback(
    (value: string, documentReferenceInputMask?: string, onInvalidMask?: (error: Error) => void): boolean => {
      if (!documentReferenceInputMask && !value) {
        return true
      }

      if (!documentReferenceInputMask) {
        return true
      }

      if (!value) {
        return false
      }

      try {
        const regex = new RegExp(documentReferenceInputMask)
        return regex.test(value)
      } catch (error) {
        onInvalidMask?.(error as Error)
        return true
      }
    },
    []
  )

  const validateEvidence = useCallback(
    ({
      values,
      personalInfoRequired,
      documentReferenceInputMask,
      minimumAge,
      t,
      onInvalidMask,
    }: {
      values: EvidenceCollectionFormState
      personalInfoRequired: boolean
      documentReferenceInputMask?: string
      minimumAge: number
      t: TranslationFn
      onInvalidMask?: (error: Error) => void
    }): EvidenceCollectionFormErrors => {
      const errors: EvidenceCollectionFormErrors = {}

      if (!isDocumentNumberValid(values.documentNumber, documentReferenceInputMask, onInvalidMask)) {
        errors.documentNumber = t('BCSC.EvidenceIDCollection.DocumentNumberError')
      }

      if (!personalInfoRequired) {
        return errors
      }

      if (!values.firstName) {
        errors.firstName = t('BCSC.EvidenceIDCollection.FirstNameError')
      }

      if (!values.lastName) {
        errors.lastName = t('BCSC.EvidenceIDCollection.LastNameError')
      }

      // Convert from YYYY/MM/DD to YYYY-MM-DD for validation
      const canonicalBirthDate = toCanonicalBirthDate(values.birthDate)
      const isBirthDateValid = isCanonicalBirthDateValid(canonicalBirthDate)

      if (!isBirthDateValid) {
        errors.birthDate = t('BCSC.EvidenceIDCollection.BirthDateError')
      }

      if (isBirthDateValid && !isOfMinimumAge(canonicalBirthDate, minimumAge)) {
        errors.birthDate = t('BCSC.EvidenceIDCollection.BirthDateAgeError', { minimumAge })
      }

      if (values.middleNames && values.middleNames.split(' ').length > 2) {
        errors.middleNames = t('BCSC.EvidenceIDCollection.MiddleNamesError')
      }

      return errors
    },
    [isCanonicalBirthDateValid, isDocumentNumberValid, isOfMinimumAge, toCanonicalBirthDate]
  )

  return {
    toCanonicalBirthDate,
    isCanonicalBirthDateValid,
    isOfMinimumAge,
    isDocumentNumberValid,
    validateEvidence,
  }
}

export default useEvidenceIDCollectionModel
