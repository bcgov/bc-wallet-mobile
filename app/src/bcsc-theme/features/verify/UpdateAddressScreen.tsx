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
import { BCState, BCDispatchAction } from '@/store'

import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import Form, { FormField } from '@/components/Form'

type UpdateAddressScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.UpdateAddressScreen>
}

const UpdateAddressScreen: React.FC<UpdateAddressScreenProps> = () => {
  const { t } = useTranslation()
  const { ColorPallet, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
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
    {
      name: 'province',
      label: t('Unified.Address.Province', 'Province'),
      type: 'text',
      validation: {
        required: t('Form.RequiredField', 'This field is required'),
      },
    },
    {
      name: 'country',
      label: t('Unified.Address.Country', 'Country'),
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
    streetLine1: store.bcsc?.address.streetLine1 || '',
    streetLine2: store.bcsc?.address.streetLine2 || '',
    city: store.bcsc?.address.city || '',
    province: store.bcsc?.address.province || '',
    country: store.bcsc?.address.country || '',
    postalCode: store.bcsc?.address.postalCode || '',
  }

  console.log(store.bcsc.address)

  const onSubmit = async (data: Record<string, any>) => {
    try {
      dispatch( { type : BCDispatchAction.UPDATE_ADDRESS, payload: [data] })
      // navigation.navigate(BCSCScreens.NextScreen)
    } catch (error) {
      logger.error(`Error updating address: ${error}`)
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
