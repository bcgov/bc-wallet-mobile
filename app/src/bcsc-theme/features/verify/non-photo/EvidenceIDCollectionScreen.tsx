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
 * Screen for collecting ID evidence information from the user.
 *
 * Note: Depending on which card type is selected, additional evidence fields may be required. ie: First name, last name, birth date, etc.
 *
 * @param {EvidenceIDCollectionScreenProps} props - The props for the screen, including navigation and route parameters.
 * @returns {*} {JSX.Element} The rendered EvidenceIDCollectionScreen component.
 */
const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { cardType } = route.params

  const [evidenceErrors, setEvidenceErrors] = useState<EvidenceCollectionFormErrors>({})
  const [evidence, setEvidence] = useState<EvidenceCollectionFormState>(evidenceInitialState)

  const additionalEvidenceRequired =
    store.bcsc.cardType === BCSCCardType.Other &&
    store.bcsc.additionalEvidenceData.length === 1 &&
    !store.bcsc.userMetadata

  /**
   * Handles changes to the form fields.
   *
   * @param {keyof EvidenceCollectionFormState} field - The field being updated.
   * @param {string} value - The new value for the field.
   * @returns {*} {void}
   */
  const handleChange = (field: keyof EvidenceCollectionFormState, value: string) => {
    setEvidence((prev) => ({ ...prev, [field]: value.trim() }))
    // clear field-specific error on change
    setEvidenceErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  /**
   * Validates the document number against the card type's input mask.
   *
   * @param {string} value - The document number to validate.
   * @returns {boolean} True if the document number is valid, false otherwise.
   */
  const validateDocumentNumber = (value: string): boolean => {
    if (!cardType.document_reference_input_mask || !value) {
      return true // No validation needed if no mask or empty value
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
   * @param {string} value - The birth date to validate.
   * @returns {boolean} True if the birth date is valid, false otherwise.
   */
  const validateDate = (value: string): boolean => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

    if (!regex.test(value)) {
      return false
    }

    // invalid dates return NaN for getTime()
    return !isNaN(new Date(value).getTime())
  }

  /**
   * Validates the evidence form fields.
   *
   * @param {EvidenceCollectionFormState} values - The current form values.
   * @param {boolean} additionalEvidenceRequired - Whether additional evidence fields are required.
   * @returns {*} {EvidenceCollectionFormErrors} An object containing validation errors
   */
  const validateEvidence = (values: EvidenceCollectionFormState, additionalEvidenceRequired: boolean) => {
    const errors: EvidenceCollectionFormErrors = {}

    if (!values.documentNumber || !validateDocumentNumber(values.documentNumber)) {
      errors.documentNumber = 'Please enter a valid document number'
    }

    if (!additionalEvidenceRequired) {
      return errors
    }

    if (!values.firstName) {
      errors.firstName = 'Please enter a first name'
    }

    if (!values.lastName) {
      errors.lastName = 'Please enter a last name'
    }

    if (!values.birthDate || !validateDate(values.birthDate)) {
      errors.birthDate = 'Please enter a valid birth date using format: YYYY-MM-DD'
    }

    if (values.middleNames && values.middleNames.split(' ').length > 2) {
      errors.middleNames = 'Please enter up to two middle names'
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
    setEvidenceErrors({})

    const evidenceFormErrors = validateEvidence(evidence, additionalEvidenceRequired)

    // if there are validation errors, display them and do not proceed
    if (Object.keys(evidenceFormErrors).length > 0) {
      setEvidenceErrors(evidenceFormErrors)
      return
    }

    if (additionalEvidenceRequired) {
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [evidence.birthDate] })
      dispatch({
        type: BCDispatchAction.UPDATE_USER_METADATA,
        payload: [{ firstName: evidence.firstName, lastName: evidence.lastName, middleNames: evidence.middleNames }],
      })
    }

    dispatch({
      type: BCDispatchAction.UPDATE_EVIDENCE_DOCUMENT_NUMBER,
      payload: [{ evidenceType: route.params.cardType, documentNumber: evidence.documentNumber }],
    })

    const hasPhotoEvidence = store.bcsc.additionalEvidenceData.some((item) => {
      return item.evidenceType.has_photo
    })

    if (hasPhotoEvidence) {
      // we have photo evidence, take the evidence back to the setup steps
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
      return
    }

    // if no photo evidence is available, navigate back to the evidence list screen
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
            value={evidence.documentNumber}
            onChange={(value) => handleChange('documentNumber', value)}
            error={evidenceErrors.documentNumber}
            subtext={`For example: ${cardType.document_reference_sample}`}
          />

          {additionalEvidenceRequired ? (
            <>
              <InputWithValidation
                label={'Last name'}
                value={evidence.lastName}
                onChange={(value) => handleChange('lastName', value)}
                error={evidenceErrors.lastName}
                subtext={'Also known as surname or family name'}
              />

              <InputWithValidation
                label={'First name'}
                value={evidence.firstName}
                onChange={(value) => handleChange('firstName', value)}
                error={evidenceErrors.firstName}
                subtext={'Your first given name'}
              />

              <InputWithValidation
                label={'Middle names'}
                value={evidence.middleNames}
                onChange={(value) => handleChange('middleNames', value)}
                error={evidenceErrors.middleNames}
                subtext={'Additional given names. Only up to 2 are needed.'}
              />

              <InputWithValidation
                label={'Birth date'}
                value={evidence.birthDate}
                onChange={(value) => handleChange('birthDate', value)}
                error={evidenceErrors.birthDate}
                subtext={'Format: YYYY-MM-DD'}
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
