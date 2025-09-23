import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import QRCodePhone from '@assets/img/qr-code-phone.png'
import QRScan from '@assets/img/qr-code-scan.png'
import TabNavigator from '@assets/img/tab-navigator-account.png'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { Image, ScrollView, StyleSheet, View } from 'react-native'

const TAB_NAVIGATOR = Image.resolveAssetSource(TabNavigator)
const QR_CODE_PHONE = Image.resolveAssetSource(QRCodePhone)
const QR_SCAN = Image.resolveAssetSource(QRScan)

const TransferInstructionsScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.md,
    },
  })

  return (
    <ScrollView>
      <View style={styles.container}>
        <ThemedText variant="headerTitle" style={{ paddingBottom: Spacing.lg }}>
          Scan your QR code to transfer your account
        </ThemedText>

        <ThemedText>1. On your other device, open the BC Services Card app and go to the Account section.</ThemedText>
        <Image
          source={TAB_NAVIGATOR}
          style={{ height: 200, aspectRatio: 1, marginTop: Spacing.md }}
          resizeMode={'contain'}
        />

        <ThemedText>2. Choose "Transfer to another device" to get your QR code.</ThemedText>
        <Image
          source={QR_CODE_PHONE}
          style={{ height: 300, aspectRatio: 0.5, marginTop: Spacing.md }}
          resizeMode={'contain'}
        />

        <ThemedText>3. Continue on this device and scan that QR code.</ThemedText>
        <Image
          source={QR_SCAN}
          style={{ height: 300, aspectRatio: 0.5, marginTop: Spacing.md }}
          resizeMode={'contain'}
        />

        <View style={{ margin: Spacing.lg, gap: Spacing.sm, width: '100%' }}>
          <Button
            buttonType={ButtonType.Primary}
            title="Transfer Account From Another Device"
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountQRScan)
            }}
          />
        </View>
      </View>
    </ScrollView>
  )
}

export default TransferInstructionsScreen
