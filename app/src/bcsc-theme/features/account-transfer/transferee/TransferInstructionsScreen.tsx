import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import QRCodePhone from '@assets/img/qr-code-phone.png'
import QRScan from '@assets/img/qr-code-scan.png'
import TabNavigator from '@assets/img/tab-navigator-account.png'
import { Button, ButtonType, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image } from 'react-native'

const TAB_NAVIGATOR = Image.resolveAssetSource(TabNavigator)
const QR_CODE_PHONE = Image.resolveAssetSource(QRCodePhone)
const QR_SCAN = Image.resolveAssetSource(QRScan)

const TransferInstructionsScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.TransferInstructions.ScanQRCode')}
      onPress={() => {
        navigation.navigate(BCSCScreens.TransferAccountQRScan)
      }}
    />
  )

  return (
    <ScreenWrapper controls={controls} padded scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.TransferInstructions.Title')}</ThemedText>

      <ThemedText>{t('BCSC.TransferInstructions.Step1')}</ThemedText>
      <Image
        source={TAB_NAVIGATOR}
        style={{ height: 100, aspectRatio: 2, alignSelf: 'center' }}
        resizeMode={'contain'}
      />

      <ThemedText>{t('BCSC.TransferInstructions.Step2')}</ThemedText>
      <Image
        source={QR_CODE_PHONE}
        style={{ height: 300, aspectRatio: 0.5, alignSelf: 'center' }}
        resizeMode={'contain'}
      />

      <ThemedText>{t('BCSC.TransferInstructions.Step3')}</ThemedText>
      <Image source={QR_SCAN} style={{ height: 300, aspectRatio: 0.5, alignSelf: 'center' }} resizeMode={'contain'} />
    </ScreenWrapper>
  )
}

export default TransferInstructionsScreen
