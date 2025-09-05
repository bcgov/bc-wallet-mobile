import * as BcscCore from '@/../../packages/bcsc-core/src/index'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, DispatchAction, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, View } from 'react-native'
import { getAccount } from 'react-native-bcsc-core'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const [, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { deleteRegistration } = useRegistrationApi()

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
    // Todo(TL): needs implementation on ios https://github.com/bcgov/bc-wallet-mobile/issues/2636
    // remove this conditional block when implemented
    if (Platform.OS !== 'android') {
      logger.info('removeAccount not implemented on iOS')
      return
    }

    const account = await getAccount()
    if (!account?.clientID) {
      logger.error('Account is null or missing clientID - cannot proceed with deletion')
      return
    }

    logger.info(`Starting account deletion for clientID: ${account.clientID}`)

    let serverDeleteSucceeded = false
    try {
      logger.info('Attempting IAS account deletion...')
      const deleteRequestResult = await deleteRegistration(account.clientID)

      if (!deleteRequestResult?.success) {
        throw new Error(`Delete request failed: ${JSON.stringify(deleteRequestResult)}`)
      }

      serverDeleteSucceeded = true
      logger.info(`IAS deletion request successful: ${JSON.stringify(deleteRequestResult)}`)

      logger.info('Clearing local account file...')
      await BcscCore.removeAccount()
      logger.info('Local account file cleared successfully')

      dispatch({ type: BCDispatchAction.CLEAR_BCSC })
      logger.info('BCSC state cleared')

      logger.info('Registering new account...')
      await registration.register()
      logger.info('Registration completed successfully')

      logger.info('Logging out user...')
      dispatch({ type: DispatchAction.DID_AUTHENTICATE, payload: [false] })

      logger.info('Account removal process completed successfully')
    } catch (error: any) {
      if (serverDeleteSucceeded) {
        // Server deletion succeeded but local cleanup failed
        logger.error('Server deletion succeeded but local cleanup failed:', error)

        // TODO(TL): The account is in a partially deleted state here.
        // We could recommend the user reinstalls the app or we could implement some recovery mechanism.
      } else {
        // The deletion fails outright, everything is still in tact here
        logger.error('IAS delete request failed, local account remains intact:', error)
      }
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
