import DateInput from '@/bcsc-theme/components/DateInput'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { MINIMUM_VERIFICATION_AGE } from '@/constants'
import { BCState, NonBCSCUserMetadata } from '@/store'
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
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import useEvidenceIDCollectionModel, {
  EvidenceCollectionFormErrors,
  EvidenceCollectionFormState,
} from './useEvidenceIDCollectionModel'

const FIELD_ORDER: (keyof EvidenceCollectionFormState)[] = [
  'documentNumber',
  'lastName',
  'firstName',
  'middleNames',
  'birthDate',
]

type EvidenceIDCollectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceIDCollection>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceIDCollection>
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
  const { updateUserInfo, updateUserMetadata, updateEvidenceDocumentNumber, removeEvidenceByType } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { toCanonicalBirthDate, validateEvidence } = useEvidenceIDCollectionModel()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { cardType } = route.params
  const evidenceIndex = store.bcscSecure.additionalEvidenceData.findIndex(
    (e) => e.evidenceType?.evidence_type === cardType.evidence_type
  )
  const scrollViewRef = useRef<ScrollView>(null)
  const formContainerY = useRef(0)
  const fieldYOffsets = useRef<Partial<Record<keyof EvidenceCollectionFormState, number>>>({})

  const scrollToFirstError = (errors: EvidenceCollectionFormErrors) => {
    const firstErrorField = FIELD_ORDER.find((field) => errors[field] !== undefined)
    if (!firstErrorField || fieldYOffsets.current[firstErrorField] === undefined) {
      return
    }
    scrollViewRef.current?.scrollTo({
      y: formContainerY.current + (fieldYOffsets.current[firstErrorField] ?? 0),
      animated: true,
    })
  }

  // If we have a document number from the route params (ie: from scanning), use that.
  // Otherwise, if this cardType already has an entry in additionalEvidenceData, use the
  // document number from there (ie: user is going back to edit). Otherwise,
  // default to empty string.
  const initialDocumentNumber =
    route.params.documentNumber ?? store.bcscSecure.additionalEvidenceData[evidenceIndex]?.documentNumber ?? ''

  // Personal info (name, DOB) is only collected on the first of two IDs in the NonBCSC flow.
  // The second ID only needs a document number since personal info was already captured.
  const isFirstAdditionalID = store.bcscSecure.additionalEvidenceData.length === 1
  const personalInfoRequired = store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC && isFirstAdditionalID

  const [formState, setFormState] = useState<EvidenceCollectionFormState>({
    documentNumber: initialDocumentNumber,
    firstName: store.bcscSecure.userMetadata?.name?.first ?? '',
    middleNames: store.bcscSecure.userMetadata?.name?.middle ?? '',
    lastName: store.bcscSecure.userMetadata?.name?.last ?? '',
    birthDate: store.bcscSecure.birthdate?.toISOString().split('T')[0] ?? '',
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
   * Handles the continue button press.
   *
   * @returns {*} {Promise<void>}
   */
  const handleOnContinue = async () => {
    try {
      setIsSubmitting(true)
      // clear previous validation errors
      setFormErrors({})

      const evidenceFormErrors = validateEvidence({
        values: formState,
        personalInfoRequired,
        documentReferenceInputMask: cardType.document_reference_input_mask,
        minimumAge: MINIMUM_VERIFICATION_AGE,
        t,
        onInvalidMask: (error) =>
          logger.error(`Invalid regex pattern: ${cardType.document_reference_input_mask}`, error),
      })

      // if there are validation errors, display them and do not proceed
      if (Object.keys(evidenceFormErrors).length > 0) {
        setFormErrors(evidenceFormErrors)
        scrollToFirstError(evidenceFormErrors)
        return
      }

      if (personalInfoRequired) {
        // Convert birth date to canonical format (YYYY-MM-DD) for storage and comparison
        const canonicalBirthDate = toCanonicalBirthDate(formState.birthDate)

        await updateUserInfo({
          birthdate: new Date(canonicalBirthDate),
        })

        const newUserMetadata: NonBCSCUserMetadata = {
          name: {
            first: formState.firstName.trim(),
            last: formState.lastName.trim(),
            middle: formState.middleNames.trim(),
          },
        }

        // Preserve address data if it has already been set (eg. from a barcode scan)
        if (store.bcscSecure.userMetadata?.address) {
          newUserMetadata.address = store.bcscSecure.userMetadata.address
        }

        await updateUserMetadata(newUserMetadata)
      }

      await updateEvidenceDocumentNumber(route.params.cardType, formState.documentNumber)
    } catch (error) {
      logger.error('Error submitting user metadata form', error as Error)
      return
    } finally {
      setIsSubmitting(false)
    }

    const hasPhotoEvidence = store.bcscSecure.additionalEvidenceData?.some((item) => {
      return item?.evidenceType?.has_photo
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
              // Second time around: must select a photo ID, no "Other Options" escape hatch
              photoFilter: 'photo',
            },
          },
        ],
      })
    )
  }

  const handleOnCancel = async () => {
    try {
      await removeEvidenceByType(cardType)
    } catch (error) {
      logger.error('Error removing evidence on cancel', error as Error)
    }

    const navParams: BCSCVerifyStackParams[BCSCScreens.EvidenceTypeList] = {
      cardProcess: store.bcscSecure.cardProcess ?? BCSCCardProcess.BCSCNonPhoto,
    }
    if (store.bcscSecure.cardProcess === BCSCCardProcess.BCSCNonPhoto) {
      navParams.photoFilter = 'photo'
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: BCSCScreens.SetupSteps },
          {
            name: BCSCScreens.EvidenceTypeList,
            params: navParams,
          },
        ],
      })
    )
  }

  const controls = (
    <>
      <Button
        title="Continue"
        accessibilityLabel={a11yLabel(t('Global.Continue'))}
        testID={testIdWithKey('EvidenceIDCollectionContinue')}
        buttonType={ButtonType.Primary}
        onPress={handleOnContinue}
        disabled={isSubmitting}
      >
        {isSubmitting && <ButtonLoading />}
      </Button>
      <Button
        title="Cancel"
        accessibilityLabel={a11yLabel(t('Global.Cancel'))}
        testID={testIdWithKey('EvidenceIDCollectionCancel')}
        buttonType={ButtonType.Secondary}
        onPress={handleOnCancel}
      />
    </>
  )

  return (
    <ScreenWrapper keyboardActive={true} controls={controls} scrollViewRef={scrollViewRef}>
      <ThemedText variant={'headingThree'}>{cardType.evidence_type_label}</ThemedText>
      <ThemedText style={{ paddingVertical: 16 }}>
        {t('BCSC.EvidenceIDCollection.Heading1')}{' '}
        <Text style={{ fontWeight: 'bold' }}>{t('BCSC.EvidenceIDCollection.Heading2')}</Text>{' '}
        {t('BCSC.EvidenceIDCollection.Heading3')}
      </ThemedText>
      <View
        style={{ marginVertical: 10, width: '100%', gap: 18 }}
        onLayout={(e) => {
          formContainerY.current = e.nativeEvent.layout.y
        }}
      >
        <InputWithValidation
          id={'documentNumber'}
          label={cardType.document_reference_label}
          value={formState.documentNumber}
          onChange={(value) => handleChange('documentNumber', value)}
          error={formErrors.documentNumber}
          subtext={`${t('BCSC.EvidenceIDCollection.DocumentNumberSubtext')} ${cardType.document_reference_sample}`}
          textInputProps={{ autoCorrect: false }}
          onLayout={(e) => {
            fieldYOffsets.current.documentNumber = e.nativeEvent.layout.y
          }}
        />

        {personalInfoRequired ? (
          <>
            <InputWithValidation
              id={'lastName'}
              label={t('BCSC.EvidenceIDCollection.LastNameLabel')}
              value={formState.lastName}
              onChange={(value) => handleChange('lastName', value)}
              error={formErrors.lastName}
              subtext={t('BCSC.EvidenceIDCollection.LastNameSubtext')}
              textInputProps={{ autoCorrect: false, autoComplete: 'name-family', textContentType: 'familyName' }}
              onLayout={(e) => {
                fieldYOffsets.current.lastName = e.nativeEvent.layout.y
              }}
            />

            <InputWithValidation
              id={'firstName'}
              label={t('BCSC.EvidenceIDCollection.FirstNameLabel')}
              value={formState.firstName}
              onChange={(value) => handleChange('firstName', value)}
              error={formErrors.firstName}
              subtext={t('BCSC.EvidenceIDCollection.FirstNameSubtext')}
              textInputProps={{ autoCorrect: false, autoComplete: 'name-given', textContentType: 'givenName' }}
              onLayout={(e) => {
                fieldYOffsets.current.firstName = e.nativeEvent.layout.y
              }}
            />

            <InputWithValidation
              id={'middleNames'}
              label={t('BCSC.EvidenceIDCollection.MiddleNamesLabel')}
              value={formState.middleNames}
              onChange={(value) => handleChange('middleNames', value)}
              error={formErrors.middleNames}
              subtext={t('BCSC.EvidenceIDCollection.MiddleNamesSubtext')}
              textInputProps={{ autoCorrect: false, autoComplete: 'name-middle', textContentType: 'middleName' }}
              onLayout={(e) => {
                fieldYOffsets.current.middleNames = e.nativeEvent.layout.y
              }}
            />

            <DateInput
              id={'birthDate'}
              label={t('BCSC.EvidenceIDCollection.BirthDateLabel')}
              value={formState.birthDate}
              onChange={(date) => handleChange('birthDate', date)}
              error={formErrors.birthDate}
              subtext={t('BCSC.EvidenceIDCollection.BirthDateSubtext')}
              onLayout={(e) => {
                fieldYOffsets.current.birthDate = e.nativeEvent.layout.y
              }}
            />
          </>
        ) : null}
      </View>
    </ScreenWrapper>
  )
}

export default EvidenceIDCollectionScreen
