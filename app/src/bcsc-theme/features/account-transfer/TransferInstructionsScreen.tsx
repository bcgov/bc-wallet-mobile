import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import QRCodePhone from '@assets/img/qr-code-phone.png'
import QRScan from '@assets/img/qr-code-scan.png'
import TabNavigator from '@assets/img/tab-navigator-account.png'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TAB_NAVIGATOR = Image.resolveAssetSource(TabNavigator)
const QR_CODE_PHONE = Image.resolveAssetSource(QRCodePhone)
const QR_SCAN = Image.resolveAssetSource(QRScan)

const TransferInstructionsScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const styles = StyleSheet.create({
    contentContainer: {
      flex: 1,
      gap: Spacing.md,
    },
    controlsContainer: {},
  })

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: Spacing.md }} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'}>{t('Unified.TransferInstructions.Title')}</ThemedText>

          <ThemedText>{t('Unified.TransferInstructions.Step1')}</ThemedText>
          <Image
            source={TAB_NAVIGATOR}
            style={{ height: 100, aspectRatio: 2, alignSelf: 'center' }}
            resizeMode={'contain'}
          />

          <ThemedText>{t('Unified.TransferInstructions.Step2')}</ThemedText>
          <Image
            source={QR_CODE_PHONE}
            style={{ height: 300, aspectRatio: 0.5, alignSelf: 'center' }}
            resizeMode={'contain'}
          />

          <ThemedText>{t('Unified.TransferInstructions.Step3')}</ThemedText>
          <Image
            source={QR_SCAN}
            style={{ height: 300, aspectRatio: 0.5, alignSelf: 'center' }}
            resizeMode={'contain'}
          />
        </View>
        <Button
          buttonType={ButtonType.Primary}
          title={t('Unified.TransferInstructions.ScanQRCode')}
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountQRScan)
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferInstructionsScreen
