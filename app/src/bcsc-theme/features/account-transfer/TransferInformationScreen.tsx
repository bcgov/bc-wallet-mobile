import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import TwoPhones from '@assets/img/transfer-account-two-phones.png'
import { Button, ButtonType, ThemedText } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TWO_PHONES = Image.resolveAssetSource(TwoPhones)

const TransferInformationScreen: React.FC = () => {
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCRootStackParams>>()

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        <Image source={TWO_PHONES} style={{ height: 300, width: 'auto', marginTop: 16 }} resizeMode={'contain'} />
        <ThemedText variant="headerTitle">{t('Unified.TransferInformation.Title')}</ThemedText>
        <ThemedText>{t('Unified.TransferInformation.Instructions')}</ThemedText>
        <Button
          title={t('Unified.TransferInformation.TransferAccount')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default TransferInformationScreen
