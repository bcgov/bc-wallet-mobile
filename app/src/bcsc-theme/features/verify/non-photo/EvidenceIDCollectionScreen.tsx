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
  useAnimatedComponents,
  useServices,
  useStore,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'

type EvidenceCollectionFormState = {
  documentNumber: string
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
 * @returns {*} {React.ReactElement} The rendered EvidenceIDCollectionScreen component.
 */
const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store] = useStore<BCState>()
  const { updateEvidenceDocumentNumber, removeEvidenceByType } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { cardType } = route.params

  const [formState, setFormState] = useState<EvidenceCollectionFormState>({
    documentNumber: '',
  })
  const [formErrors, setFormErrors] = useState<EvidenceCollectionFormErrors>({})

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
   * Validates the formState form fields.
   *
   * @param {EvidenceCollectionFormState} values - The current form values.
   * @returns {*} {EvidenceCollectionFormErrors} An object containing validation errors
   */
  const validateEvidence = (values: EvidenceCollectionFormState) => {
    const errors: EvidenceCollectionFormErrors = {}

    if (!isDocumentNumberValid(values.documentNumber)) {
      errors.documentNumber = t('BCSC.EvidenceIDCollection.DocumentNumberError')
    }

    return errors
  }

  /**
   * Handles the continue button press.
   *
   * @returns {*} {Promise<void>}
   */
  const handleOnContinue = async () => {
    try {
      setIsSubmitting(true)
      // clear previous validation errors
      setFormErrors({})

      const evidenceFormErrors = validateEvidence(formState)

      // if there are validation errors, display them and do not proceed
      if (Object.keys(evidenceFormErrors).length > 0) {
        setFormErrors(evidenceFormErrors)
        return
      }

      await updateEvidenceDocumentNumber(route.params.cardType, formState.documentNumber)
    } catch (error) {
      logger.error('Error submitting user metadata form', error as Error)
      return
    } finally {
      setIsSubmitting(false)
    }

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
        disabled={isSubmitting}
      >
        {isSubmitting && <ButtonLoading />}
      </Button>
      <Button
        title="Cancel"
        accessibilityLabel={'Cancel'}
        testID={testIdWithKey('EvidenceIDCollectionCancel')}
        buttonType={ButtonType.Tertiary}
        onPress={async () => {
          await removeEvidenceByType(cardType)
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: BCSCScreens.SetupSteps },
                { name: BCSCScreens.EvidenceTypeList, params: { cardProcess: BCSCCardProcess.BCSCNonPhoto } },
              ],
            })
          )
        }}
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

      </View>
    </ScreenWrapper>
  )
}

export default EvidenceIDCollectionScreen
