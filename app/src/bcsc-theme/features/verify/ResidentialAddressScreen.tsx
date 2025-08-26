import useAuthorizationApi from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, KeyboardView, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
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

type ResidentialAddressFormErrors = {
  streetAddress?: string
  city?: string
  province?: string
  postalCode?: string
}

const initialFormState: ResidentialAddressFormState = {
  streetAddress: '',
  city: '',
  province: '',
  postalCode: '',
}

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

  const [formState, setFormState] = useState<ResidentialAddressFormState>(initialFormState)
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
    },
    lineBreak: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      width: '100%',
      marginBottom: Spacing.md,
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

    if (!store.bcsc.birthdate || !store.bcsc.additionalEvidenceData[0]?.userMetadata) {
      // TODO (MD): Better error handling for sad path
      throw new Error('Missing required user information from store')
    }

    const deviceAuth = await authorization.authorizeDeviceWithTokenHint({
      firstName: store.bcsc.additionalEvidenceData[0].userMetadata.firstName,
      lastName: store.bcsc.additionalEvidenceData[0].userMetadata.lastName,
      birthDate: store.bcsc.birthdate.toISOString().split('T')[0],
      address: {
        streetAddress: formState.streetAddress,
        locality: formState.city,
        region: formState.province,
        postalCode: formState.postalCode,
        country: 'CA',
      },
    })

    console.log(deviceAuth)

    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
    dispatch({
      type: BCDispatchAction.UPDATE_EMAIL,
      payload: [{ email: deviceAuth.verified_email, emailConfirmed: !!deviceAuth.verified_email }],
    })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
    dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <KeyboardView>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.Address.Heading', 'Update Your Address')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.sm }}>
            {t('Unified.Address.Paragraph', 'Please provide your current address information.')}
          </ThemedText>
          <View style={styles.lineBreak} />

          <InputWithValidation
            label={'Street address'}
            value={formState.streetAddress}
            onChange={(value) => handleChange('streetAddress', value)}
            error={formErrors.streetAddress}
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

            <Button
              title="Cancel"
              accessibilityLabel={'Cancel'}
              testID={testIdWithKey('ResidentialAddressCancel')}
              buttonType={ButtonType.Tertiary}
              onPress={() => navigation.goBack()}
            />
          </View>
        </ScrollView>
      </KeyboardView>
    </SafeAreaView>
  )
}
