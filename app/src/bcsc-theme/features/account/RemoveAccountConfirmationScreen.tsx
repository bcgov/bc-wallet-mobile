import { BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, useStore, useTheme, Button, ButtonType, useServices, TOKENS, DispatchAction } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet, View, Platform } from 'react-native'
import * as BcscCore from '@/../../packages/bcsc-core/src/index'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useTranslation } from 'react-i18next'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const [, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()

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

  const handleRemoveAccount = async () => {
    try {
      // Todo(TL): needs implementation on ios https://github.com/bcgov/bc-wallet-mobile/issues/2636
      if (Platform.OS === 'android') {
        await BcscCore.removeAccount()
        dispatch({ type: BCDispatchAction.CLEAR_BCSC })
        // refresh accounts file with new account
        await registration.register()
        // log out
        dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [false] })
      } else {
        logger.info('removeAccount not implemented on IOS')
      }
    } catch (error: unknown) {
      logger.error(error)
    }
  }

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
          onPress={handleRemoveAccount}
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
