import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCMainStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type AccountNavigationProp = StackNavigationProp<BCSCMainStackParams>

/**
 * Screen that confirms the user's intent to remove their account.
 *
 * Uses local loading state instead of the global BCSCLoadingProvider overlay,
 * because the global overlay persists above RootStack and gets stuck when
 * the navigator tree swaps during factory reset.
 *
 * @returns {*} {React.ReactElement} The RemoveAccountConfirmationScreen component.
 */
const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing, ColorPalette } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isRemoving, setIsRemoving] = useState(false)

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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
    },
  })

  if (isRemoving) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
          <ThemedText>{t('BCSC.Account.RemoveAccountLoading')}</ThemedText>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <ThemedText variant={'headingThree'}>{t('BCSC.Account.RemoveAccountTitle')}</ThemedText>
        <ThemedText>{t('BCSC.Account.RemoveAccountParagraph')}</ThemedText>
      </ScrollView>
      <View style={styles.buttonsContainer}>
        <Button
          accessibilityLabel={t('BCSC.Account.RemoveAccount')}
          buttonType={ButtonType.Critical}
          title={t('BCSC.Account.RemoveAccount')}
          onPress={async () => {
            try {
              setIsRemoving(true)

              logger.info('[RemoveAccount] User confirmed account removal, proceeding with verification reset')

              const result = await factoryReset()

              if (!result.success) {
                logger.error('[RemoveAccount] Failed to remove account', result.error)
              }
            } catch (error) {
              logger.error('[RemoveAccount] Error during account removal', error as Error)
              setIsRemoving(false)
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
