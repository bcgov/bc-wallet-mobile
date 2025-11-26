import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'

import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const TransferQRInformationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const styles = StyleSheet.create({
    contentContainer: {
      gap: Spacing.md,
    },
  })

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.TransferQRInformation.GetQRCode')}
        onPress={() => {
          navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
        }}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.TransferQRInformation.LearnMore')}
        onPress={() => {
          // TODO: (Alfred) BCSC opens a web page inside the app, it doesn't open the page in the mobile browser
        }}
      />
    </>
  )
  return (
    <ScreenWrapper controls={controls}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{t('BCSC.TransferQRInformation.Title')}</ThemedText>
        <ThemedText>{t('BCSC.TransferQRInformation.Instructions')}</ThemedText>
        <ThemedText variant={'bold'}>{t('BCSC.TransferQRInformation.Warning')}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default TransferQRInformationScreen
