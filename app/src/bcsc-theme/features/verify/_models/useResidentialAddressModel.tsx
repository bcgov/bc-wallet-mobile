import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCanadianPostalCode, ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BCDispatchAction, BCState } from '@/store'
import { ToastType, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Toast from 'react-native-toast-message'

export type ResidentialAddressFormState = {
  streetAddress: string
  city: string
  province: ProvinceCode | null
  postalCode: string
}

export type ResidentialAddressFormErrors = {
  streetAddress?: string
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
  const [store, dispatch] = useStore<BCState>()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [formState, setFormState] = useState<ResidentialAddressFormState>({
    streetAddress: store.bcsc.userMetadata?.address?.streetAddress ?? '',
    city: store.bcsc.userMetadata?.address?.city ?? '',
    province: (store.bcsc.userMetadata?.address?.province as ProvinceCode) ?? null,
    postalCode: store.bcsc.userMetadata?.address?.postalCode ?? '',
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
    dispatch({
      type: BCDispatchAction.UPDATE_USER_ADDRESS_METADATA,
      payload: [
        {
          streetAddress: formState.streetAddress.trim(),
          postalCode: formState.postalCode.trim(),
          city: formState.city.trim(),
          province: formState.province,
          country: 'CA',
        },
      ],
    })

    // A2: device is already authorized
    if (store.bcsc.deviceCode && store.bcsc.deviceCodeExpiresAt) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
      return
    }

    // missing required user attributes
    // making the assumption that the user metadata has been previously saved ie: Step 1
    if (!store.bcsc.birthdate || !store.bcsc.userMetadata?.name) {
      logger.error('ResidentialAddressScreen.handleSubmit -> invalid state detected', {
        birthdate: store.bcsc.birthdate,
        name: store.bcsc.userMetadata?.name,
      })

      throw new Error(t('BCSC.Address.MissingPrerequisiteAttributes'))
    }

    try {
      setIsSubmitting(true)

      const deviceAuth = await authorization.authorizeDeviceWithUnknownBCSC({
        firstName: store.bcsc.userMetadata.name.first,
        lastName: store.bcsc.userMetadata.name.last,
        birthdate: store.bcsc.birthdate.toISOString().split('T')[0],
        middleNames: store.bcsc.userMetadata.name.middle,
        address: {
          streetAddress: formState.streetAddress,
          city: formState.city,
          province: formState.province as ProvinceCode, // field has already been validated
          postalCode: formState.postalCode,
        },
      })

      // device previously registered, but no deviceCode found in store
      if (deviceAuth === null && !store.bcsc.deviceCode) {
        logger.error('ResidentialAddressScreen.handleSubmit -> invalid state detected, no deviceCode found')
        throw new Error(t('BCSC.Address.NoDeviceCodeFound'))
      }

      Toast.show({
        type: ToastType.Success,
        text1: t('BCSC.Address.AddressSaved'),
        bottomOffset: Spacing.lg,
        autoHide: true,
        visibilityTime: 1500,
      })

      // device has already been registered
      if (deviceAuth === null) {
        logger.info(`Device has already been registered`)
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
        return
      }

      logger.info(`Updating deviceCode: ${deviceAuth.device_code}`)

      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION, payload: [deviceAuth] })

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
  }, [formState, validateForm, dispatch, store.bcsc, navigation, logger, t, authorization, Spacing.lg])

  return {
    formState,
    formErrors,
    isSubmitting,
    handleChange,
    handleSubmit,
  }
}

export default useResidentialAddressModel
