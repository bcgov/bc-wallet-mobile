import useApi from '@/bcsc-theme/api/hooks/useApi'
import { EvidenceMetadataResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import DateInput from '@/bcsc-theme/components/DateInput'
import { DropdownOption, DropdownWithValidation } from '@/bcsc-theme/components/DropdownWithValidation'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCardEvidenceComplete } from '@/bcsc-theme/utils/card-utils'
import { getPhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { MINIMUM_VERIFICATION_AGE } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState, NonBCSCUserMetadata } from '@/store'
import { withAlert } from '@/utils/alert'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
} from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { BCSCCardProcess, EvidenceType, PhotoMetadata } from 'react-native-bcsc-core'
import useEvidenceIDCollectionModel, {
  EvidenceCollectionFormErrors,
  EvidenceCollectionFormState,
} from './useEvidenceIDCollectionModel'

type FocusableField = keyof EvidenceCollectionFormState | 'evidenceType'

const FIELD_ORDER: FocusableField[] = [
  'evidenceType',
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

const EvidenceIDCollectionScreen = ({ navigation, route }: EvidenceIDCollectionScreenProps) => {
  const [store] = useStore<BCState>()
  const { updateUserInfo, updateUserMetadata, upsertEvidence } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { evidence } = useApi()
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { toCanonicalBirthDate, validateEvidence } = useEvidenceIDCollectionModel()
  const { failedToReadFromLocalStorageAlert } = useAlerts(navigation)
  const photoPath = route.params?.photoPath

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedType, setSelectedType] = useState<EvidenceType | null>(null)
  const [evidenceTypeError, setEvidenceTypeError] = useState<string | undefined>(undefined)

  const scrollViewRef = useRef<ScrollView>(null)
  const formContainerY = useRef(0)
  const fieldYOffsets = useRef<Partial<Record<FocusableField, number>>>({})

  const cardProcess = store.bcscSecure.cardProcess
  const additionalEvidenceData = store.bcscSecure.additionalEvidenceData

  const { data, load, isLoading } = useDataLoader<EvidenceMetadataResponseData>(() => evidence.getEvidenceMetadata(), {
    onError: (error: unknown) => {
      logger.error(`Error loading evidence metadata: ${error}`)
    },
  })

  useEffect(() => {
    load()
  }, [load])

  // Filter evidence types the user is currently allowed to choose.
  // Mirrors the FIRST/SECOND/BOTH gating in EvidenceTypeListScreen so the dropdown
  // never offers an option that the upload backend would reject.
  const availableTypes = useMemo<EvidenceType[]>(() => {
    if (!data) {
      return []
    }
    const firstEntry = additionalEvidenceData[0]
    const isFirstComplete = !!firstEntry && isCardEvidenceComplete(firstEntry)
    const types: EvidenceType[] = []
    data.processes.forEach((p) => {
      if (p.process !== cardProcess) {
        return
      }
      p.evidence_types.forEach((e) => {
        const alreadyComplete = additionalEvidenceData.some(
          (ev) => ev.evidenceType?.evidence_type_label === e.evidence_type_label && isCardEvidenceComplete(ev)
        )
        if (alreadyComplete) {
          return
        }
        if (e.collection_order === 'BOTH') {
          types.push(e)
          return
        }
        if (!isFirstComplete) {
          if (e.collection_order === 'FIRST') {
            types.push(e)
          }
          return
        }
        if (e.collection_order === 'SECOND') {
          types.push(e)
        }
      })
    })
    return types
  }, [data, cardProcess, additionalEvidenceData])

  const dropdownOptions = useMemo<DropdownOption<string>[]>(
    () => availableTypes.map((type) => ({ label: type.evidence_type_label, value: type.evidence_type })),
    [availableTypes]
  )

  // Personal info (name, DOB) is collected only on the first ID in the NonBCSC flow;
  // the second ID re-uses what the user already gave us.
  const isFirstAdditionalID = !additionalEvidenceData.some((e) => isCardEvidenceComplete(e))
  const personalInfoRequired = cardProcess === BCSCCardProcess.NonBCSC && isFirstAdditionalID

  const [formState, setFormState] = useState<EvidenceCollectionFormState>({
    documentNumber: '',
    firstName: store.bcscSecure.userMetadata?.name?.first ?? '',
    middleNames: store.bcscSecure.userMetadata?.name?.middle ?? '',
    lastName: store.bcscSecure.userMetadata?.name?.last ?? '',
    birthDate: store.bcscSecure.birthdate?.toISOString().split('T')[0] ?? '',
  })
  const [formErrors, setFormErrors] = useState<EvidenceCollectionFormErrors>({})

  const handleChange = (field: keyof EvidenceCollectionFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSelectType = (typeId: string) => {
    const found = availableTypes.find((type) => type.evidence_type === typeId) ?? null
    setSelectedType(found)
    setEvidenceTypeError(undefined)
    // Document number is type-specific (different masks/labels); clear it when the type changes.
    setFormState((prev) => ({ ...prev, documentNumber: '' }))
    setFormErrors((prev) => ({ ...prev, documentNumber: undefined }))
  }

  const scrollToFirstError = (errors: EvidenceCollectionFormErrors, typeError?: string) => {
    const firstErrorField = FIELD_ORDER.find((field) => {
      if (field === 'evidenceType') {
        return !!typeError
      }
      return errors[field] !== undefined
    })
    if (!firstErrorField || fieldYOffsets.current[firstErrorField] === undefined) {
      return
    }
    scrollViewRef.current?.scrollTo({
      y: formContainerY.current + (fieldYOffsets.current[firstErrorField] ?? 0),
      animated: true,
    })
  }

  const handleOnContinue = async () => {
    setFormErrors({})
    setEvidenceTypeError(undefined)

    if (!selectedType) {
      const errMsg = t('BCSC.EvidenceIDCollection.TypeOfIDError')
      setEvidenceTypeError(errMsg)
      scrollToFirstError({}, errMsg)
      return
    }

    try {
      setIsSubmitting(true)

      const evidenceFormErrors = validateEvidence({
        values: formState,
        personalInfoRequired,
        documentReferenceInputMask: selectedType.document_reference_input_mask,
        minimumAge: MINIMUM_VERIFICATION_AGE,
        t,
        onInvalidMask: (error) =>
          logger.error(`Invalid regex pattern: ${selectedType.document_reference_input_mask}`, error),
      })

      if (Object.keys(evidenceFormErrors).length > 0) {
        setFormErrors(evidenceFormErrors)
        scrollToFirstError(evidenceFormErrors)
        return
      }

      if (personalInfoRequired) {
        const canonicalBirthDate = toCanonicalBirthDate(formState.birthDate)
        await updateUserInfo({ birthdate: new Date(canonicalBirthDate) })

        const newUserMetadata: NonBCSCUserMetadata = {
          name: {
            first: formState.firstName.trim(),
            last: formState.lastName.trim(),
            middle: formState.middleNames.trim(),
          },
        }
        if (store.bcscSecure.userMetadata?.address) {
          newUserMetadata.address = store.bcscSecure.userMetadata.address
        }
        await updateUserMetadata(newUserMetadata)
      }

      let photoMetadata: PhotoMetadata | undefined
      if (photoPath) {
        const getPhotoMetadataWithAlert = withAlert(getPhotoMetadata, failedToReadFromLocalStorageAlert)
        photoMetadata = await getPhotoMetadataWithAlert(photoPath, logger)
      }

      await upsertEvidence({
        evidenceType: selectedType,
        metadata: photoMetadata ? [photoMetadata] : [],
        documentNumber: formState.documentNumber,
      })
    } catch (error) {
      logger.error('Error submitting evidence', error as Error)
      return
    } finally {
      setIsSubmitting(false)
    }

    // After save: if we now have a photo ID we're done; otherwise capture another.
    const haveAnyPhotoID =
      selectedType.has_photo || additionalEvidenceData.some((item) => item?.evidenceType?.has_photo)

    if (haveAnyPhotoID) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
      return
    }

    navigation.navigate(BCSCScreens.EvidenceCapture)
  }

  const willHavePhotoAfterSubmit =
    (selectedType?.has_photo ?? false) || additionalEvidenceData.some((item) => item?.evidenceType?.has_photo)
  const submitLabel = willHavePhotoAfterSubmit
    ? t('Global.Continue')
    : t('BCSC.EvidenceIDCollection.TakePhotoOfSecondID')

  const controls = (
    <Button
      title={submitLabel}
      accessibilityLabel={a11yLabel(submitLabel)}
      testID={testIdWithKey('EvidenceIDCollectionContinue')}
      buttonType={ButtonType.Primary}
      onPress={handleOnContinue}
      disabled={isSubmitting}
    >
      {isSubmitting && <ButtonLoading />}
    </Button>
  )

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <ScreenWrapper keyboardActive={true} controls={controls} scrollViewRef={scrollViewRef}>
      <ThemedText variant={'headingThree'}>{t('BCSC.EvidenceIDCollection.ConfirmHeader')}</ThemedText>
      <ThemedText style={{ paddingVertical: 16 }}>{t('BCSC.EvidenceIDCollection.ConfirmDescription')}</ThemedText>
      <View
        style={{ marginVertical: 10, width: '100%', gap: 18 }}
        onLayout={(e) => {
          formContainerY.current = e.nativeEvent.layout.y
        }}
      >
        <View
          onLayout={(e) => {
            fieldYOffsets.current.evidenceType = e.nativeEvent.layout.y
          }}
        >
          <DropdownWithValidation
            id={'evidenceType'}
            value={selectedType?.evidence_type ?? null}
            options={dropdownOptions}
            onChange={handleSelectType}
            label={t('BCSC.EvidenceIDCollection.TypeOfIDLabel')}
            placeholder={t('BCSC.EvidenceIDCollection.TypeOfIDPlaceholder')}
            error={evidenceTypeError}
          />
        </View>

        {selectedType ? (
          <InputWithValidation
            id={'documentNumber'}
            label={selectedType.document_reference_label}
            value={formState.documentNumber}
            onChange={(value) => handleChange('documentNumber', value)}
            error={formErrors.documentNumber}
            subtext={`${t('BCSC.EvidenceIDCollection.DocumentNumberSubtext')} ${selectedType.document_reference_sample}`}
            textInputProps={{ autoCorrect: false }}
            onLayout={(e) => {
              fieldYOffsets.current.documentNumber = e.nativeEvent.layout.y
            }}
          />
        ) : null}

        {selectedType && personalInfoRequired ? (
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
