import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

/**
 * Screen that confirms the user's intent to remove their account.
 *
 * @returns {*} {JSX.Element} The RemoveAccountConfirmationScreen component.
 */
const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
    },
    buttonsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    textContainer: {
      marginBottom: Spacing.md,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText variant={'headingThree'}>{t('Unified.Account.RemoveAccountTitle')}</ThemedText>
        <ThemedText>{t('Unified.Account.RemoveAccountParagraph')}</ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <Button
          accessibilityLabel={t('Unified.Account.RemoveAccount')}
          buttonType={ButtonType.Critical}
          title={t('Unified.Account.RemoveAccount')}
          onPress={factoryReset}
        />
        <Button
          accessibilityLabel={t('Global.Cancel')}
          buttonType={ButtonType.Secondary}
          title={t('Global.Cancel')}
          onPress={() => navigation.goBack()}
        />
      </View>
    </View>
  )
}

export default RemoveAccountConfirmationScreen
