import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  Text,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, View } from 'react-native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import DatePicker from 'react-native-date-picker'

type EvidenceCollectionFormState = {
  documentNumber: string
  firstName: string
  lastName: string
  middleNames: string
  birthDate: string
}

type EvidenceCollectionFormErrors = Partial<EvidenceCollectionFormState>

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceIDCollection>
  route: { params: { cardType: EvidenceType } }
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
  const [store] = useStore<BCState>()
  const { updateUserInfo, updateUserMetadata, updateEvidenceDocumentNumber } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const [openDatePicker, setOpenDatePicker] = useState(false)
  const { cardType } = route.params

  const [formState, setFormState] = useState<EvidenceCollectionFormState>({
    documentNumber: '', // make the user re-enter every time
    firstName: store.bcscSecure.userMetadata?.name?.first ?? '',
    middleNames: store.bcscSecure.userMetadata?.name?.middle ?? '',
    lastName: store.bcscSecure.userMetadata?.name?.last ?? '',
    birthDate: store.bcscSecure.birthdate?.toISOString().split('T')[0] ?? '',
  })
  const [formErrors, setFormErrors] = useState<EvidenceCollectionFormErrors>({})

  const additionalEvidenceRequired = store.bcscSecure.additionalEvidenceData.length === 1

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
    // no validation needed if no mask and empty value
    if (!cardType.document_reference_input_mask && !value) {
      return true
    }

    if (!value) {
      return false
    }

    try {
      const regex = new RegExp(cardType.document_reference_input_mask)
      return regex.test(value)
    } catch (error) {
      logger.error(`Invalid regex pattern: ${cardType.document_reference_input_mask}`, error as Error)
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
      errors.documentNumber = t('BCSC.EvidenceIDCollection.DocumentNumberError')
    }
    if (!additionalEvidenceRequired) {
      return errors
    }
    if (!values.firstName) {
      errors.firstName = t('BCSC.EvidenceIDCollection.FirstNameError')
    }
    if (!values.lastName) {
      errors.lastName = t('BCSC.EvidenceIDCollection.LastNameError')
    }
    if (!isDateValid(values.birthDate)) {
      errors.birthDate = t('BCSC.EvidenceIDCollection.BirthDateError')
    }
    if (values.middleNames && values.middleNames.split(' ').length > 2) {
      errors.middleNames = t('BCSC.EvidenceIDCollection.MiddleNamesError')
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
      await updateUserInfo({
        birthdate: new Date(formState.birthDate),
      })

      await updateUserMetadata({
        name: {
          // trim whitespace from names just in case
          first: formState.firstName.trim(),
          last: formState.lastName.trim(),
          middle: formState.middleNames.trim(),
        },
      })
    }

    await updateEvidenceDocumentNumber(route.params.cardType, formState.documentNumber)

    const hasPhotoEvidence = store.bcscSecure.additionalEvidenceData?.some((item) => {
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
        routes: [
          {
            name: BCSCScreens.SetupSteps,
          },
          {
            name: BCSCScreens.EvidenceTypeList,
            params: {
              cardProcess: BCSCCardProcess.BCSCNonPhoto,
            },
          },
        ],
      })
    )
  }

  const controls = (
    <>
      <Button
        title="Continue"
        accessibilityLabel={'Continue'}
        testID={testIdWithKey('EvidenceIDCollectionContinue')}
        buttonType={ButtonType.Primary}
        onPress={handleOnContinue}
      />
      <Button
        title="Cancel"
        accessibilityLabel={'Cancel'}
        testID={testIdWithKey('EvidenceIDCollectionCancel')}
        buttonType={ButtonType.Tertiary}
        onPress={() => navigation.goBack()}
      />
    </>
  )

  return (
    <ScreenWrapper keyboardActive={true} controls={controls}>
      <ThemedText variant={'headingThree'}>{cardType.evidence_type_label}</ThemedText>
      <ThemedText style={{ paddingVertical: 16 }}>
        {t('BCSC.EvidenceIDCollection.Heading1')}{' '}
        <Text style={{ fontWeight: 'bold' }}>{t('BCSC.EvidenceIDCollection.Heading2')}</Text>{' '}
        {t('BCSC.EvidenceIDCollection.Heading3')}
      </ThemedText>
      <View style={{ marginVertical: 10, width: '100%', gap: 18 }}>
        <InputWithValidation
          id={'documentNumber'}
          label={cardType.document_reference_label}
          value={formState.documentNumber}
          onChange={(value) => handleChange('documentNumber', value)}
          error={formErrors.documentNumber}
          subtext={`${t('BCSC.EvidenceIDCollection.DocumentNumberSubtext')} ${cardType.document_reference_sample}`}
          textInputProps={{ autoCorrect: false }}
        />

        {additionalEvidenceRequired ? (
          <>
            <InputWithValidation
              id={'lastName'}
              label={t('BCSC.EvidenceIDCollection.LastNameLabel')}
              value={formState.lastName}
              onChange={(value) => handleChange('lastName', value)}
              error={formErrors.lastName}
              subtext={t('BCSC.EvidenceIDCollection.LastNameSubtext')}
              textInputProps={{ autoCorrect: false }}
            />

            <InputWithValidation
              id={'firstName'}
              label={t('BCSC.EvidenceIDCollection.FirstNameLabel')}
              value={formState.firstName}
              onChange={(value) => handleChange('firstName', value)}
              error={formErrors.firstName}
              subtext={t('BCSC.EvidenceIDCollection.FirstNameSubtext')}
              textInputProps={{ autoCorrect: false }}
            />

            <InputWithValidation
              id={'middleNames'}
              label={t('BCSC.EvidenceIDCollection.MiddleNamesLabel')}
              value={formState.middleNames}
              onChange={(value) => handleChange('middleNames', value)}
              error={formErrors.middleNames}
              subtext={t('BCSC.EvidenceIDCollection.MiddleNamesSubtext')}
              textInputProps={{ autoCorrect: false }}
            />

            <DatePicker
              modal
              open={openDatePicker}
              mode="date"
              title={t('BCSC.EvidenceIDCollection.BirthDatePickerLabel')}
              date={formState.birthDate ? new Date(formState.birthDate) : new Date()}
              onConfirm={(date) => {
                setOpenDatePicker(false)
                handleChange('birthDate', date.toISOString().split('T')[0])
              }}
              onCancel={() => {
                setOpenDatePicker(false)
              }}
              testID={testIdWithKey('BirthDatePicker')}
              accessibilityLabel={t('BCSC.EvidenceIDCollection.BirthDatePickerAccessibilityLabel')}
            />

            <InputWithValidation
              id={'birthDate'}
              label={t('BCSC.EvidenceIDCollection.BirthDateLabel')}
              value={formState.birthDate}
              onChange={() => {
                // no-op to disable manual input
              }}
              onFocus={() => {
                Keyboard.dismiss()
                setOpenDatePicker(true)
              }}
              error={formErrors.birthDate}
              subtext={t('BCSC.EvidenceIDCollection.BirthDateSubtext')}
            />
          </>
        ) : null}
      </View>
    </ScreenWrapper>
  )
}

export default EvidenceIDCollectionScreen
