import useAuthorizationApi from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getProvinceCode, ProvinceCode } from '@/bcsc-theme/utils/get-province-code'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  KeyboardView,
  testIdWithKey,
  ThemedText,
  ToastType,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { TOKENS } from '@bifold/core/src/container-api'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  const { ColorPalette, Spacing } = useTheme()
  const navigation = useNavigation()
  const authorization = useAuthorizationApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [formState, setFormState] = useState<ResidentialAddressFormState>({
    streetAddress: store.bcsc.userMetadata?.address?.streetAddress ?? '',
    city: store.bcsc.userMetadata?.address?.city ?? '',
    province: store.bcsc.userMetadata?.address?.province ?? '',
    postalCode: store.bcsc.userMetadata?.address?.postalCode ?? '',
  })
  const [formErrors, setFormErrors] = useState<ResidentialAddressFormErrors>({})

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
      gap: 32,
    },
  })

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

    // allows: h2t-1b8 / h2z 1b8 / H2Z1B8
    // disallows: leading Z,W or to contain D, F, I, O, Q or U
    const postalCodeRegex = new RegExp(/^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVXY][ -]?\d[ABCEGHJKLMNPRSTVXY]\d$/i)

    if (!values.streetAddress) {
      errors.streetAddress = t('Unified.Address.StreetAddressRequired')
    }
    if (!values.city) {
      errors.city = t('Unified.Address.CityRequired')
    }
    if (!getProvinceCode(values.province)) {
      errors.province = t('Unified.Address.ProvinceInvalid')
    }
    if (!postalCodeRegex.test(values.postalCode)) {
      errors.postalCode = t('Unified.Address.PostalCodeInvalid')
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
    // making the assumption that the user metadata has been previously saved ie: Step 2
    if (!store.bcsc.birthdate || !store.bcsc.userMetadata?.name) {
      logger.error('ResidentialAddressScreen.handleSubmit -> invalid state detected', {
        birthdate: store.bcsc.birthdate,
        name: store.bcsc.userMetadata?.name,
      })

      throw new Error('Missing prerequisite user attributes')
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

    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <KeyboardView>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.Address.Heading')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.sm }}>{t('Unified.Address.Paragraph')}</ThemedText>

          <InputWithValidation
            id={'streetAddress1'}
            label={t('Unified.Address.StreetAddressLabel')}
            value={formState.streetAddress}
            onChange={(value) => handleChange('streetAddress', value)}
            error={formErrors.streetAddress}
            subtext={t('Unified.Address.StreetAddressSubtext')}
          />

          <InputWithValidation
            id={'city'}
            label={t('Unified.Address.CityLabel')}
            value={formState.city}
            onChange={(value) => handleChange('city', value)}
            error={formErrors.city}
            subtext={t('Unified.Address.CitySubtext')}
          />

          <InputWithValidation
            id={'province'}
            label={t('Unified.Address.ProvinceLabel')}
            value={formState.province}
            onChange={(value) => handleChange('province', value)}
            error={formErrors.province}
            subtext={t('Unified.Address.ProvinceSubtext')}
          />

          <InputWithValidation
            id={'postalCode'}
            label={t('Unified.Address.PostalCodeLabel')}
            value={formState.postalCode}
            onChange={(value) => handleChange('postalCode', value)}
            error={formErrors.postalCode}
            subtext={t('Unified.Address.PostalCodeSubtext')}
          />

          <View style={{ marginTop: 48, width: '100%' }}>
            <View style={{ marginBottom: 20 }}>
              <Button
                title="Continue"
                accessibilityLabel={'Continue'}
                testID={testIdWithKey('ResidentialAddressContinue')}
                buttonType={ButtonType.Primary}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardView>
    </SafeAreaView>
  )
}
