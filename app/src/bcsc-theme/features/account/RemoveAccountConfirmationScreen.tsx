import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
      justifyContent: 'space-between',
    },
    scrollView: {
      flexGrow: 1,
      gap: Spacing.md,
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
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <ThemedText variant={'headingThree'}>{t('Unified.Account.RemoveAccountTitle')}</ThemedText>
        <ThemedText>{t('Unified.Account.RemoveAccountParagraph')}</ThemedText>
      </ScrollView>
      <View style={styles.buttonsContainer}>
        <Button
          accessibilityLabel={t('Unified.Account.RemoveAccount')}
          buttonType={ButtonType.Critical}
          title={t('Unified.Account.RemoveAccount')}
          onPress={async () => {
            const result = await factoryReset()

            if (!result.success) {
              // TODO (MD): Show some user feedback that the factory reset failed
              logger.error('Factory reset failed', result.error)
            }
          }}
        />
        <Button
          accessibilityLabel={t('Global.Cancel')}
          buttonType={ButtonType.Secondary}
          title={t('Global.Cancel')}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}

export default RemoveAccountConfirmationScreen
