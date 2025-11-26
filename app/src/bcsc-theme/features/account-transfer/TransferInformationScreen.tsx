import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Spacing } from '@/bcwallet-theme/theme'
import TwoPhones from '@assets/img/transfer-account-two-phones.png'
import { Button, ButtonType, ScreenWrapper, ThemedText } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

const TWO_PHONES = Image.resolveAssetSource(TwoPhones)

const TransferInformationScreen: React.FC = () => {
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

  const styles = StyleSheet.create({
    contentContainer: {
      gap: Spacing.md,
    },
    controlsContainer: {
      paddingVertical: Spacing.md,
    },
  })
  return (
    <ScreenWrapper>
      <View style={styles.contentContainer}>
        <Image source={TWO_PHONES} style={{ height: 300, width: 'auto' }} resizeMode={'contain'} />
        <ThemedText variant={'headingThree'}>{t('BCSC.TransferInformation.Title')}</ThemedText>
        <ThemedText>{t('BCSC.TransferInformation.Instructions')}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          title={t('BCSC.TransferInformation.TransferAccount')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountInstructions)
          }}
        />
      </View>
    </ScreenWrapper>
  )
}

export default TransferInformationScreen
