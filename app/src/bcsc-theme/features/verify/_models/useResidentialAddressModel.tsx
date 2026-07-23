import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isCanadianPostalCode, ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { BCState, NonBCSCUserMetadata } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const [store] = useStore<BCState>()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitErrorModal } = useErrorAlert()
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
    const updatedUserMetadata: NonBCSCUserMetadata = {
      ...store.bcscSecure.userMetadata,
      address: {
        streetAddress: formState.streetAddress.trim(),
        streetAddress2: formState.streetAddress2.trim() || undefined,
        postalCode: formState.postalCode.trim(),
        city: formState.city.trim(),
        province: formState.province as ProvinceCode, // we know this is present because validation passed
        country: 'CA' as const,
      },
    }
    await updateUserMetadata(updatedUserMetadata)

    // A2: device is already authorized — only short-circuit when the device_code is still valid.
    // A present-but-expired code must fall through to re-authorize (mint a fresh code) rather than
    // proceed with a dead one, which would 401 on the evidence calls. See issue #4050.
    const deviceCodeStillValid = Boolean(
      store.bcscSecure.deviceCode &&
        store.bcscSecure.deviceCodeExpiresAt &&
        store.bcscSecure.deviceCodeExpiresAt.getTime() > Date.now()
    )
    if (deviceCodeStillValid) {
      // Resume at whatever step the user is now on (v4.1 routing), using the just-updated metadata.
      const predictedStore: BCState = {
        ...store,
        bcscSecure: { ...store.bcscSecure, userMetadata: updatedUserMetadata },
      }
      // Advance to the next step while keeping the history so the user can step back through the
      // flow (this address screen, then the ID forms). push preserves the back stack.
      const nextStep = getResumeStepRoute(predictedStore)
      navigation.dispatch(StackActions.push(nextStep.name, nextStep.params))
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
        birthdate: moment(store.bcscSecure.birthdate).format('YYYY-MM-DD'),
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

      logger.info(`Updating deviceCode: ${deviceAuth.device_code}`)

      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
      await updateDeviceCodes({
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        deviceCodeExpiresAt: expiresAt,
      })
      await updateVerificationOptions(deviceAuth.verification_options.split(' ') as DeviceVerificationOption[])
      await updateCardProcess(deviceAuth.process)

      const predictedStore: BCState = {
        ...store,
        bcscSecure: {
          ...store.bcscSecure,
          userMetadata: updatedUserMetadata,
          deviceCode: deviceAuth.device_code,
          userCode: deviceAuth.user_code,
          deviceCodeExpiresAt: expiresAt,
          cardProcess: deviceAuth.process,
        },
      }
      // Advance to the next step while keeping the history so the user can step back through the
      // flow (this address screen, then the ID forms). push preserves the back stack.
      const nextStep = getResumeStepRoute(predictedStore)
      navigation.dispatch(StackActions.push(nextStep.name, nextStep.params))
    } catch (error) {
      logger.error('ResidentialAddressScreen.handleSubmit -> device authorization failed', { error })
      emitErrorModal(
        t('BCSC.Address.AuthorizationErrorTitle'),
        t('BCSC.Address.AuthorizationErrorMessage'),
        ensureAppError(error, AppEventCode.DEVICE_AUTHORIZATION_ERROR)
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    validateForm,
    formState,
    store,
    updateUserMetadata,
    navigation,
    logger,
    emitErrorModal,
    t,
    authorization,
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
