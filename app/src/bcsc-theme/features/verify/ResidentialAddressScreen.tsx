import useApi from '@/bcsc-theme/api/hooks/useApi'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getProvinceCode, isCanadianPostalCode, ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  testIdWithKey,
  ThemedText,
  ToastType,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Toast from 'react-native-toast-message'

type ResidentialAddressFormState = {
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

type ResidentialAddressFormErrors = Partial<ResidentialAddressFormState>

/**
 * Screen for collecting residential address information from the user.
 *
 * @returns {*} {JSX.Element} The ResidentialAddressScreen component.
 */
export const ResidentialAddressScreen = () => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const navigation = useNavigation()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [formState, setFormState] = useState<ResidentialAddressFormState>({
    streetAddress: store.bcsc.userMetadata?.address?.streetAddress ?? '',
    city: store.bcsc.userMetadata?.address?.city ?? '',
    province: store.bcsc.userMetadata?.address?.province ?? '',
    postalCode: store.bcsc.userMetadata?.address?.postalCode ?? '',
  })
  const [formErrors, setFormErrors] = useState<ResidentialAddressFormErrors>({})

  /**
   * Handles changes to the form fields.
   *
   * @param {keyof ResidentialAddressFormState} field - The field being updated.
   * @param {string} value - The new value for the field.
   * @returns {*} {void}
   */
  const handleChange = (field: keyof ResidentialAddressFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    // clear field-specific error on change
    setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  /**
   * Validates the Residential Address form and returns the errors
   *
   * @param {ResidentialAddressFormState} values - The form values to validate
   * @returns {*} ResidentialAddressFormErrors
   */
  const validateForm = (values: ResidentialAddressFormState): ResidentialAddressFormErrors => {
    // TODO (MD): Investigate a proper schema validation library if this gets more complex ie: yup, zod, etc.
    const errors: ResidentialAddressFormErrors = {}

    if (!values.streetAddress) {
      errors.streetAddress = t('BCSC.Address.StreetAddressRequired')
    }
    if (!values.city) {
      errors.city = t('BCSC.Address.CityRequired')
    }
    if (!getProvinceCode(values.province)) {
      errors.province = t('BCSC.Address.ProvinceInvalid')
    }
    if (!isCanadianPostalCode(values.postalCode)) {
      errors.postalCode = t('BCSC.Address.PostalCodeInvalid')
    }

    return errors
  }

  const handleSubmit = async () => {
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
          province: getProvinceCode(formState.province.trim()),
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

    // TODO (MD): Handle if this request fails, but is not a registration error. ie: failed network request
    const deviceAuth = await authorization.authorizeDeviceWithUnknownBCSC({
      firstName: store.bcsc.userMetadata.name.first,
      lastName: store.bcsc.userMetadata.name.last,
      birthdate: store.bcsc.birthdate.toISOString().split('T')[0],
      middleNames: store.bcsc.userMetadata.name.middle,
      address: {
        streetAddress: formState.streetAddress,
        city: formState.city,
        province: getProvinceCode(formState.province) as ProvinceCode, // field has already been validated,
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
      text1: 'Address saved',
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

    // QUESTION (MD): What is the correct value for expiresAt?
    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
    dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
    dispatch({
      type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
      payload: [deviceAuth.verification_options.split(' ')],
    })

    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
  }

  return (
    <ScreenWrapper keyboardActive={true} scrollViewContainerStyle={{ gap: Spacing.xl }}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.Address.Heading')}
      </ThemedText>

      <ThemedText style={{ marginBottom: Spacing.sm }}>{t('BCSC.Address.Paragraph')}</ThemedText>

      <InputWithValidation
        id={'streetAddress1'}
        label={t('BCSC.Address.StreetAddressLabel')}
        value={formState.streetAddress}
        onChange={(value) => handleChange('streetAddress', value)}
        error={formErrors.streetAddress}
        subtext={t('BCSC.Address.StreetAddressSubtext')}
      />

      <InputWithValidation
        id={'city'}
        label={t('BCSC.Address.CityLabel')}
        value={formState.city}
        onChange={(value) => handleChange('city', value)}
        error={formErrors.city}
        subtext={t('BCSC.Address.CitySubtext')}
      />

      <InputWithValidation
        id={'province'}
        label={t('BCSC.Address.ProvinceLabel')}
        value={formState.province}
        onChange={(value) => handleChange('province', value)}
        error={formErrors.province}
        subtext={t('BCSC.Address.ProvinceSubtext')}
      />

      <InputWithValidation
        id={'postalCode'}
        label={t('BCSC.Address.PostalCodeLabel')}
        value={formState.postalCode}
        onChange={(value) => handleChange('postalCode', value)}
        error={formErrors.postalCode}
        subtext={t('BCSC.Address.PostalCodeSubtext')}
      />

      <View style={{ marginTop: 48, width: '100%' }}>
        <View style={{ marginBottom: 20 }}>
          <Button
            title={t('Global.Continue')}
            accessibilityLabel={t('Global.Continue')}
            testID={testIdWithKey('ResidentialAddressContinue')}
            buttonType={ButtonType.Primary}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </ScreenWrapper>
  )
}
