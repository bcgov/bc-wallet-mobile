import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCanadianPostalCode, ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BCState } from '@/store'
import { ToastType, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'

export type ResidentialAddressFormState = {
  streetAddress: string
  streetAddress2: string
  city: string
  province: ProvinceCode | null
  postalCode: string
}

export type ResidentialAddressFormErrors = {
  streetAddress?: string
  streetAddress2?: string
  city?: string
  province?: string
  postalCode?: string
}

type useResidentialAddressModelProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ResidentialAddress>
}

/**
 * Model hook for the ResidentialAddressScreen that provides:
 * - Form state and error management
 * - Form validation
 * - Submit handler with device authorization
 */
const useResidentialAddressModel = ({ navigation }: useResidentialAddressModelProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateCardProcess, updateUserMetadata, updateDeviceCodes, updateVerificationOptions } = useSecureActions()

  const [formState, setFormState] = useState<ResidentialAddressFormState>({
    streetAddress: store.bcscSecure.userMetadata?.address?.streetAddress ?? '',
    streetAddress2: store.bcscSecure.userMetadata?.address?.streetAddress2 ?? '',
    city: store.bcscSecure.userMetadata?.address?.city ?? '',
    province: store.bcscSecure.userMetadata?.address?.province ?? null,
    postalCode: store.bcscSecure.userMetadata?.address?.postalCode ?? '',
  })
  const [formErrors, setFormErrors] = useState<ResidentialAddressFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Handles changes to the form fields.
   *
   * @param {keyof ResidentialAddressFormState} field - The field being updated.
   * @param {ResidentialAddressFormState[keyof ResidentialAddressFormState]} value - The new value for the field.
   */
  const handleChange = useCallback(
    <K extends keyof ResidentialAddressFormState>(field: K, value: ResidentialAddressFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      // clear field-specific error on change
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    []
  )

  /**
   * Validates the Residential Address form and returns the errors
   *
   * @param {ResidentialAddressFormState} values - The form values to validate
   * @returns {ResidentialAddressFormErrors}
   */
  const validateForm = useCallback(
    (values: ResidentialAddressFormState): ResidentialAddressFormErrors => {
      // TODO (MD): Investigate a proper schema validation library if this gets more complex ie: yup, zod, etc.
      const errors: ResidentialAddressFormErrors = {}

      if (!values.streetAddress) {
        errors.streetAddress = t('BCSC.Address.StreetAddressRequired')
      }
      if (!values.city) {
        errors.city = t('BCSC.Address.CityRequired')
      }
      if (!values.province) {
        errors.province = t('BCSC.Address.ProvinceInvalid')
      }
      if (!isCanadianPostalCode(values.postalCode)) {
        errors.postalCode = t('BCSC.Address.PostalCodeInvalid')
      }

      return errors
    },
    [t]
  )

  /**
   * Handles form submission, validates the form, updates user metadata,
   * and performs device authorization if needed.
   */
  const handleSubmit = useCallback(async () => {
    setFormErrors({})

    const errors = validateForm(formState)

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // A1: update user metadata
    // QUESTION: Does updating the data here make sense if the IAS device auth is tied to the previous values?
    // If no: swap this block (A1) and the check for the deviceCode (A2)
    const updatedUserMetadata = {
      ...store.bcscSecure.userMetadata,
      address: {
        streetAddress: formState.streetAddress.trim(),
        ...(formState.streetAddress2.trim() ? { streetAddress2: formState.streetAddress2.trim() } : {}),
        postalCode: formState.postalCode.trim(),
        city: formState.city.trim(),
        province: formState.province as ProvinceCode, // we know this is present because validation passed
        country: 'CA' as const,
      },
    }
    await updateUserMetadata(updatedUserMetadata)

    // A2: device is already authorized
    if (store.bcscSecure.deviceCode && store.bcscSecure.deviceCodeExpiresAt) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
      return
    }

    // missing required user attributes
    // making the assumption that the user metadata has been previously saved ie: Step 1
    if (!store.bcscSecure.birthdate || !store.bcscSecure.userMetadata?.name) {
      logger.error('ResidentialAddressScreen.handleSubmit -> invalid state detected', {
        birthdate: store.bcscSecure.birthdate,
        name: store.bcscSecure.userMetadata?.name,
      })

      throw new Error(t('BCSC.Address.MissingPrerequisiteAttributes'))
    }

    try {
      setIsSubmitting(true)

      const streetAddress2Trimmed = formState.streetAddress2.trim()
      const mergedStreetAddress = streetAddress2Trimmed
        ? `${formState.streetAddress.trim()}\n${streetAddress2Trimmed}`
        : formState.streetAddress.trim()

      const deviceAuth = await authorization.authorizeDeviceWithUnknownBCSC({
        firstName: store.bcscSecure.userMetadata.name.first,
        lastName: store.bcscSecure.userMetadata.name.last,
        birthdate: store.bcscSecure.birthdate.toISOString().split('T')[0],
        middleNames: store.bcscSecure.userMetadata.name.middle,
        address: {
          streetAddress: mergedStreetAddress,
          city: formState.city,
          province: formState.province as ProvinceCode, // field has already been validated
          postalCode: formState.postalCode,
        },
      })

      // null if handled by error policies
      if (!deviceAuth) {
        return
      }

      Toast.show({
        type: ToastType.Success,
        text1: t('BCSC.Address.AddressSaved'),
        bottomOffset: Spacing.lg,
        autoHide: true,
        visibilityTime: 1500,
      })

      logger.info(`Updating deviceCode: ${deviceAuth.device_code}`)

      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
      await updateDeviceCodes({
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        deviceCodeExpiresAt: expiresAt,
      })
      await updateVerificationOptions(deviceAuth.verification_options.split(' ') as DeviceVerificationOption[])
      await updateCardProcess(deviceAuth.process)

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    } catch (error) {
      logger.error('ResidentialAddressScreen.handleSubmit -> device authorization failed', { error })
      Toast.show({
        type: 'error',
        text1: t('BCSC.Address.AuthorizationErrorTitle'),
        text2: t('BCSC.Address.AuthorizationErrorMessage'),
        position: 'bottom',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    validateForm,
    formState,
    store.bcscSecure.userMetadata,
    store.bcscSecure.deviceCode,
    store.bcscSecure.deviceCodeExpiresAt,
    store.bcscSecure.birthdate,
    updateUserMetadata,
    navigation,
    logger,
    t,
    authorization,
    Spacing.lg,
    updateDeviceCodes,
    updateVerificationOptions,
    updateCardProcess,
  ])

  return {
    formState,
    formErrors,
    isSubmitting,
    handleChange,
    handleSubmit,
  }
}

export default useResidentialAddressModel
