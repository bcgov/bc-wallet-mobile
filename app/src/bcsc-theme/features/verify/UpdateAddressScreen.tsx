import {
  ThemedText,
  useTheme,
  KeyboardView,
  useStore,
  useServices,
  TOKENS
} from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { StackNavigationProp } from '@react-navigation/stack'
import { BCState, BCDispatchAction, Address } from '@/store'

import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import Form, { FormField } from '@/components/Form'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type UpdateAddressScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.UpdateAddressScreen>
}

const UpdateAddressScreen: React.FC<UpdateAddressScreenProps> = () => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { authorization } = useApi()
  

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

  // Define the address form fields
  const addressFields: FormField[] = [
    {
      name: 'streetLine1',
      label: t('Unified.Address.StreetLine1', 'Street Line 1'),
      type: 'text',
      validation: {
        required: t('Form.RequiredField', 'This field is required'),
      },
    },
    {
      name: 'streetLine2',
      label: t('Unified.Address.StreetLine2', 'Street Line 2 (Optional)'),
      type: 'text',
    },
    {
      name: 'city',
      label: t('Unified.Address.City', 'City'),
      type: 'text',
      validation: {
        required: t('Form.RequiredField', 'This field is required'),
      },
    },
    // this should be a dropdown in the future
    {
      name: 'province',
      label: t('Unified.Address.Province', 'Province'),
      type: 'text',
      validation: {
        required: t('Form.RequiredField', 'This field is required'),
      },
    },
    {
      name: 'postalCode',
      label: t('Unified.Address.PostalCode', 'Postal Code'),
      type: 'text',
      validation: {
        required: t('Form.RequiredField', 'This field is required'),
        pattern: {
          value: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
          message: t('UpdateAddress.PostalCode.Invalid', 'Please enter a valid postal code'),
        },
        maxLength: {
          value: 7,
        },
      },
    },
  ]

  //get default values from store if available
  const formDefaults = {
    // for non bcsc card flows, when these values are not in the store the defaults should auto populate
    // from a contact card on ios or from the equivalent on android
    streetLine1: store.bcsc?.address?.street_address || '',
    streetLine2: '', // split at newline if there is one
    city: store.bcsc?.address?.locality || '',
    province: store.bcsc?.address?.region || '',
    postalCode: store.bcsc?.address?.postal_code || '',
  }

  logger.info(`Current address in store: ${JSON.stringify(store.bcsc.address, null, 2)}`)

  const formatAddress = (address: Record<string, string>): Address => {
    //convert address from form to openid format
    return {
      street_address: `${address.streetLine1}${address?.streetLine2 ? '\n' + address.streetLine2 : ''}`,
      locality: address.city,
      region: address.province,
      postal_code: address.postalCode,
      country: 'CA' //only accepts CA
    }
  }

  const onSubmit = async (data: Record<string, any>) => {
    const formattedAddress = formatAddress(data)
    try {
      dispatch({ type: BCDispatchAction.UPDATE_ADDRESS, payload: [formattedAddress] })
      
      const audience = 'https://idsit.gov.bc.ca/device/' // This should come from config
      
    //   const id_token_hint = await jwt.createAddressJWT(audience, {
    //     familyName: 'SURNAMESON', 
    //     birthdate: '2000-01-01', 
    //     address: formattedAddress,
    //     givenName: 'GIVENONEY', 
    //     gender: 'unknown' // all needs to come from user info ^
    //   })

      const id_token_hint = 'this is a placeholder'

      logger.info(`JWT: ${id_token_hint}`)

      // hardcoded values for now
      const response = await authorization.authorizeDevice('C75102720', new Date('2000-01-01'), id_token_hint)
      logger.info(`Self-attestation successful: ${JSON.stringify(response, null, 2)}`)
      
      // navigation.navigate(BCSCScreens.NextScreen)
    } catch (error) {
    //   logger.error(`Error updating address: ${JSON.stringify(error, null, 2)}`)
        console.error(error)
    }
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
        
        <Form
          fields={addressFields}
          onSubmit={onSubmit}
          defaultValues={formDefaults}
        />
      </ScrollView>
      </KeyboardView>
    </SafeAreaView>
  )
}

export default UpdateAddressScreen
