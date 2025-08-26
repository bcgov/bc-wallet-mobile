import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { Button, ButtonType, testIdWithKey, Text, ThemedText, TOKENS, useServices, useStore } from '@bifold/core'
import { ScrollView, View } from 'react-native'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions } from '@react-navigation/native'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { useTranslation } from 'react-i18next'

type EvidenceCollectionFormState = {
  documentNumber: string
  firstName: string
  lastName: string
  middleNames: string
  birthDate: string
}

type EvidenceCollectionFormErrors = {
  documentNumber?: string
  firstName?: string
  lastName?: string
  middleNames?: string
  birthDate?: string
}

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
}

const evidenceInitialState: EvidenceCollectionFormState = {
  documentNumber: '',
  firstName: '',
  lastName: '',
  middleNames: '',
  birthDate: '',
}

/**
 * Screen for collecting ID formState information from the user.
 *
 * Note: Depending on which card type is selected, additional formState fields may be required. ie: First name, last name, birth date, etc.
 *
 * @param {EvidenceIDCollectionScreenProps} props - The props for the screen, including navigation and route parameters.
 * @returns {*} {JSX.Element} The rendered EvidenceIDCollectionScreen component.
 */
const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { cardType } = route.params

  const [formState, setFormState] = useState<EvidenceCollectionFormState>(evidenceInitialState)
  const [formErrors, setFormErrors] = useState<EvidenceCollectionFormErrors>({})

  const additionalEvidenceRequired =
    store.bcsc.cardType === BCSCCardType.Other && store.bcsc.additionalEvidenceData.length === 1

  /**
   * Handles changes to the form fields.
   *
   * @param {keyof EvidenceCollectionFormState} field - The field being updated.
   * @param {string} value - The new value for the field.
   * @returns {*} {void}
   */
  const handleChange = (field: keyof EvidenceCollectionFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    // clear field-specific error on change
    setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  /**
   * Validates the document number against the card type's input mask.
   *
   * @param {string} value - The document number to validate.
   * @returns {boolean} True if the document number is valid, false otherwise.
   */
  const isDocumentNumberValid = (value: string): boolean => {
    if (!cardType.document_reference_input_mask || !value) {
      return true // No validation needed if no mask or empty value
    }

    if (!value) {
      return false
    }

    try {
      const regex = new RegExp(cardType.document_reference_input_mask)
      return regex.test(value)
    } catch (error) {
      logger.error('Invalid regex pattern:', cardType.document_reference_input_mask, JSON.stringify(error))
      return true
    }
  }

  /**
   * Validates the birth date format (YYYY-MM-DD) and checks if it's a valid date.
   *
   * @param {string} [value] - The birth date to validate.
   * @returns {boolean} True if the birth date is valid, false otherwise.
   */
  const isDateValid = (value?: string): boolean => {
    if (!value) {
      return false
    }

    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

    if (!regex.test(value)) {
      return false
    }

    // invalid dates return NaN for getTime()
    return !isNaN(new Date(value).getTime())
  }

  /**
   * Validates the formState form fields.
   *
   * @param {EvidenceCollectionFormState} values - The current form values.
   * @param {boolean} additionalEvidenceRequired - Whether additional formState fields are required.
   * @returns {*} {EvidenceCollectionFormErrors} An object containing validation errors
   */
  const validateEvidence = (values: EvidenceCollectionFormState, additionalEvidenceRequired: boolean) => {
    const errors: EvidenceCollectionFormErrors = {}

    if (!isDocumentNumberValid(values.documentNumber)) {
      errors.documentNumber = t('EvidenceIDCollection.DocumentNumberError')
    }
    if (!additionalEvidenceRequired) {
      return errors
    }
    if (!values.firstName) {
      errors.firstName = t('Unified.EvidenceIDCollection.FirstNameError')
    }
    if (!values.lastName) {
      errors.lastName = t('Unified.EvidenceIDCollection.LastNameError')
    }
    if (!isDateValid(values.birthDate)) {
      errors.birthDate = t('Unified.EvidenceIDCollection.BirthDateError')
    }
    if (values.middleNames && values.middleNames.split(' ').length > 2) {
      errors.middleNames = t('Unified.EvidenceIDCollection.MiddleNamesError')
    }

    return errors
  }

  /**
   * Handles the continue button press.
   *
   * @returns {*} {Promise<void>}
   */
  const handleOnContinue = async () => {
    // clear previous validation errors
    setFormErrors({})

    const evidenceFormErrors = validateEvidence(formState, additionalEvidenceRequired)

    // if there are validation errors, display them and do not proceed
    if (Object.keys(evidenceFormErrors).length > 0) {
      setFormErrors(evidenceFormErrors)
      return
    }

    // update the store with the collected user metadata formState
    if (additionalEvidenceRequired) {
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [formState.birthDate] })
      dispatch({
        type: BCDispatchAction.UPDATE_EVIDENCE_USER_METADATA,
        payload: [
          {
            evidenceType: route.params.cardType,
            userMetadata: {
              // trim whitespace from names just in case
              firstName: formState.firstName.trim(),
              lastName: formState.lastName.trim(),
              middleNames: formState.middleNames.trim(),
            },
          },
        ],
      })
    }

    dispatch({
      type: BCDispatchAction.UPDATE_EVIDENCE_DOCUMENT_NUMBER,
      payload: [{ evidenceType: route.params.cardType, documentNumber: formState.documentNumber }],
    })

    const hasPhotoEvidence = store.bcsc.additionalEvidenceData.some((item) => {
      return item.evidenceType.has_photo
    })

    if (hasPhotoEvidence) {
      // we have photo formState, take the formState back to the setup steps
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
      return
    }

    // if no photo formState is available, navigate back to the formState list screen
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EvidenceTypeList }],
      })
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedText variant={'headingOne'}>{cardType.evidence_type_label}</ThemedText>
        <ThemedText style={{ paddingVertical: 16 }}>
          Enter the information <Text style={{ fontWeight: 'bold' }}>{'exactly as shown'}</Text> on the ID.
        </ThemedText>
        <View style={{ marginVertical: 10, width: '100%', gap: 18 }}>
          <InputWithValidation
            label={cardType.document_reference_label}
            value={formState.documentNumber}
            onChange={(value) => handleChange('documentNumber', value)}
            error={formErrors.documentNumber}
            subtext={`${t('Unified.EvidenceIDCollection.DocumentNumberSubtext')} ${cardType.document_reference_sample}`}
          />

          {additionalEvidenceRequired ? (
            <>
              <InputWithValidation
                label={t('Unified.EvidenceIDCollection.LastNameLabel')}
                value={formState.lastName}
                onChange={(value) => handleChange('lastName', value)}
                error={formErrors.lastName}
                subtext={t('Unified.EvidenceIDCollection.LastNameSubtext')}
              />

              <InputWithValidation
                label={t('Unified.EvidenceIDCollection.FirstNameLabel')}
                value={formState.firstName}
                onChange={(value) => handleChange('firstName', value)}
                error={formErrors.firstName}
                subtext={t('Unified.EvidenceIDCollection.FirstNameSubtext')}
              />

              <InputWithValidation
                label={t('Unified.EvidenceIDCollection.MiddleNamesLabel')}
                value={formState.middleNames}
                onChange={(value) => handleChange('middleNames', value)}
                error={formErrors.middleNames}
                subtext={t('Unified.EvidenceIDCollection.MiddleNamesSubtext')}
              />

              <InputWithValidation
                label={t('Unified.EvidenceIDCollection.BirthDateLabel')}
                value={formState.birthDate}
                onChange={(value) => handleChange('birthDate', value)}
                error={formErrors.birthDate}
                subtext={t('Unified.EvidenceIDCollection.BirthDateSubtext')}
              />
            </>
          ) : null}
        </View>
        <View style={{ marginTop: 48, width: '100%' }}>
          <View style={{ marginBottom: 20 }}>
            <Button
              title="Continue"
              accessibilityLabel={'Continue'}
              testID={testIdWithKey('EvidenceIDCollectionContinue')}
              buttonType={ButtonType.Primary}
              onPress={handleOnContinue}
            />
          </View>
          <Button
            title="Cancel"
            accessibilityLabel={'Cancel'}
            testID={testIdWithKey('EvidenceIDCollectionCancel')}
            buttonType={ButtonType.Tertiary}
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default EvidenceIDCollectionScreen
