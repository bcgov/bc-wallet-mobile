import { BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, useStore, useTheme, Button, ButtonType, useServices, TOKENS } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import * as BcscCore from '@/../../packages/bcsc-core/src/index'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const RemoveAccountConfirmationScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const navigation = useNavigation<AccountNavigationProp>()
  const [, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      //   backgroundColor: BrandColors.primaryBackground,
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
      dispatch({ type: BCDispatchAction.CLEAR_BCSC })
      await BcscCore.removeAccount()

      // refresh accounts file with new account
      await registration.register()

      // log out
      dispatch({ type: 'authentication/didAuthenticate', payload: [false] })
    } catch (error: unknown) {
      logger.error(error)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText variant={'headingThree'}>{'Remove account From this app?'}</ThemedText>
        <ThemedText>{"To use this app again, you'll need to provide your ID and verify your identity"}</ThemedText>
      </View>
      <View style={styles.buttonsContainer}>
        <Button buttonType={ButtonType.Critical} title={'Remove Account'} onPress={handleRemoveAccount} />
        <Button buttonType={ButtonType.Secondary} title={'Cancel'} onPress={() => navigation.goBack()} />
      </View>
    </View>
  )
}

export default RemoveAccountConfirmationScreen
