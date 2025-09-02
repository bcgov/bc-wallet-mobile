import useAuthorizationApi from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  KeyboardView,
  testIdWithKey,
  ThemedText,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { TOKENS } from '@bifold/core/src/container-api'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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

  const validateForm = (values: ResidentialAddressFormState): ResidentialAddressFormErrors => {
    // TODO (MD): Invesigate a proper schema validation library if this gets more complex ie: yup, zod, etc.
    const errors: ResidentialAddressFormErrors = {}

    if (!values.streetAddress) {
      errors.streetAddress = t('Unified.Address.StreetAddressRequired')
    }
    if (!values.city) {
      errors.city = t('Unified.Address.CityRequired')
    }
    if (!values.province) {
      errors.province = t('Unified.Address.ProvinceRequired')
    }
    // TODO (MD): Add postal code format validation
    if (!values.postalCode) {
      errors.postalCode = t('Unified.Address.PostalCodeRequired')
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
          streetAddress: formState.streetAddress,
          postalCode: formState.postalCode,
          city: formState.city,
          province: formState.province,
          country: 'CA',
        },
      ],
    })

    // A2: device is already authorized
    if (store.bcsc.deviceCode) {
      navigation.goBack()
    }

    // missing required user attributes
    // making the assumption that the user metatdata has been prviously saved ie: Step 2
    if (!store.bcsc.birthdate || !store.bcsc.userMetadata?.name) {
      logger.error('ResidentialAddressScreen.handleSubmit -> invalid state detected', {
        birthdate: store.bcsc.birthdate,
        name: store.bcsc.userMetadata?.name,
      })

      throw new Error('Missing prerequisite user attributes')
    }

    const deviceAuth = await authorization.authorizeDeviceWithTokenHint({
      firstName: store.bcsc.userMetadata.name.first,
      lastName: store.bcsc.userMetadata.name.last,
      birthDate: store.bcsc.birthdate.toISOString().split('T')[0],
      address: {
        streetAddress: formState.streetAddress,
        locality: formState.city,
        region: formState.province,
        postalCode: formState.postalCode,
        country: 'CA',
      },
    })

    // QUESTION (MD): What is the correct value for this?
    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
    dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
  }

  // TODO (MD): Add localizations for inputs
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <KeyboardView>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.Address.Heading', 'Address')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.sm }}>
            {t('Unified.Address.Paragraph', 'Enter the address of where you live.')}
          </ThemedText>

          <InputWithValidation
            label={'Street Line 1'}
            value={formState.streetAddress}
            onChange={(value) => handleChange('streetAddress', value)}
            error={formErrors.streetAddress}
            subtext={t('')}
          />

          <InputWithValidation
            label={'City'}
            value={formState.city}
            onChange={(value) => handleChange('city', value)}
            error={formErrors.city}
            subtext={t('')}
          />

          <InputWithValidation
            label={'Province or Territory'}
            value={formState.province}
            onChange={(value) => handleChange('province', value)}
            error={formErrors.province}
            subtext={t('')}
          />

          <InputWithValidation
            label={'Postal Code'}
            value={formState.postalCode}
            onChange={(value) => handleChange('postalCode', value)}
            error={formErrors.postalCode}
            subtext={t('')}
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
