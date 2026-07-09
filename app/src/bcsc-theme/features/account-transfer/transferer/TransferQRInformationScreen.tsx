import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const TransferQRInformationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const styles = StyleSheet.create({
    contentContainer: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.TransferQRInformation.GetQRCode')}
        onPress={() => {
          navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
        }}
        testID={testIdWithKey('GetQRCodeButton')}
      />
    </ControlContainer>
  )
  return (
    <ScreenWrapper controls={controls} padded={false} scrollViewContainerStyle={styles.contentContainer}>
      <ThemedText variant={'headingThree'}>{t('BCSC.TransferQRInformation.Title')}</ThemedText>
      <ThemedText>{t('BCSC.TransferQRInformation.Instructions')}</ThemedText>
      <ThemedText>{t('BCSC.TransferQRInformation.Warning')}</ThemedText>
    </ScreenWrapper>
  )
}

export default TransferQRInformationScreen
