import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type AccountNavigationProp = StackNavigationProp<BCSCMainStackParams>

/**
 * Screen that confirms the user's intent to remove their account.
 *
 * Does not call factoryReset directly — instead navigates back to the Account
 * tab with a param signal, so the reset runs without this screen on the stack.
 * This avoids React Navigation getting into a bad state when RootStack swaps
 * navigator trees during factory reset.
 *
 * @returns {*} {React.ReactElement} The RemoveAccountConfirmationScreen component.
 */
const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const { t } = useTranslation()

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
  })

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
          onPress={() => {
            navigation.navigate(BCSCStacks.Tab, {
              screen: BCSCScreens.Account,
              params: { removeAccount: true },
            })
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
