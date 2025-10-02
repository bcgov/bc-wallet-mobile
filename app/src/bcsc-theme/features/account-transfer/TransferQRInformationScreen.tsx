import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'

import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const TransferQRInformationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCRootStackParams>>()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.md,
    },
    buttonContainer: { margin: Spacing.lg, gap: Spacing.sm, width: '100%' },
  })
  return (
    <View style={styles.container}>
      <ThemedText variant="headerTitle">{t('Unified.TransferQRInformation.Title')}</ThemedText>
      <ThemedText>{t('Unified.TransferQRInformation.Instructions')}</ThemedText>
      <ThemedText>{t('Unified.TransferQRInformation.Warning')}</ThemedText>

      <View style={styles.buttonContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={t('Unified.TransferQRInformation.GetQRCode')}
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
          }}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          buttonType={ButtonType.Tertiary}
          title={t('Unified.TransferQRInformation.LearnMore')}
          onPress={() => {
            // TODO: (Alfred) BCSC opens a web page inside the app, it doens't open the page in the mobile browser
          }}
        />
      </View>
    </View>
  )
}

export default TransferQRInformationScreen
