import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Mode } from '@/store'
import useApi from '@bcsc-theme/api/hooks/useApi'
import { ServerStatusResponseData, TermsOfUseResponseData } from '@bcsc-theme/api/hooks/useConfigApi'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import useDataLoader from '@bcsc-theme/hooks/useDataLoader'
import { Button, ButtonType, LockoutReason, ThemedText, TOKENS, useAuth, useServices, useStore, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import SampleApiDisplay from './components/SampleApiDisplay'
import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'

// Placeholder for now, not sure if we want to reuse our
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { Spacing, setTheme, themeName } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const { config, registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [registerData, setRegisterData] = useState<RegistrationResponseData | null>(null)
  const [reregisterData, setReregisterData] = useState<RegistrationResponseData | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false)
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {},
  })

  const onServerStatusError = (error: unknown) => {
    logger.error(`Error loading server status: ${error}`)
  }
  const onTermsOfUseError = (error: unknown) => {
    logger.error(`Error loading terms of use: ${error}`)
  }
  const serverStatusDataLoader = useDataLoader<ServerStatusResponseData>(() => config.getServerStatus(), {
    onError: onServerStatusError,
  })
  const termsDataLoader = useDataLoader<TermsOfUseResponseData>(() => config.getTermsOfUse(), {
    onError: onTermsOfUseError,
  })

  const onPressMode = () => {
    lockOutUser(LockoutReason.Logout)
    setTheme(BCThemeNames.BCWallet)
    dispatch({ type: BCDispatchAction.UPDATE_MODE, payload: [Mode.BCWallet] })
  }

  const onPressTheme = () => {
    if (themeName === BCThemeNames.BCSC) {
      setTheme(BCThemeNames.BCWallet)
    } else {
      setTheme(BCThemeNames.BCSC)
    }
  }

  const onPressRegister = async () => {
    try {
      const data = await registration.register()
      setRegisterData(data)
    } catch (error) {
      logger.error(`Error registering: ${error}`)
    }
  }

  const onPressReregister = async () => {
    try {
      if (registerData?.client_id) {
        const data = await registration.updateRegistration(registerData?.client_id)
        setReregisterData(data)
      } else {
        logger.warn('No client_id found for re-registration')
        setReregisterData(null)
      }
    } catch (error) {
      logger.error(`Error re-registering: ${error}`)
    }
  }

  const onPressDeleteRegistration = async () => {
    try {
      if (registerData?.client_id) {
        const { success } = await registration.deleteRegistration(registerData.client_id)
        setDeleteSuccess(success)
      } else {
        logger.warn('No client_id found for deletion')
        setDeleteSuccess(false)
      }
    } catch (error) {
      logger.error(`Error deleting registration: ${error}`)
      setDeleteSuccess(false)
    }
  }

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <SampleApiDisplay<TermsOfUseResponseData> dataLoader={termsDataLoader} title={'Terms of Use'} />
          <SampleApiDisplay<ServerStatusResponseData> dataLoader={serverStatusDataLoader} title={'Server Status'} />
          <View style={{ flex: 1 }}>
            <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
              Register
            </ThemedText>
            <Button
              title={'Register'}
              accessibilityLabel={'Register'}
              buttonType={ButtonType.Secondary}
              onPress={onPressRegister}
            />
            <ThemedText variant={'caption'}>
              {registerData && JSON.stringify(registerData, null, 2)}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
              Re-register
            </ThemedText>
            <Button
              title={'Re-register'}
              accessibilityLabel={'Re-register'}
              buttonType={ButtonType.Secondary}
              onPress={onPressReregister}
            />
            <ThemedText variant={'caption'}>
              {reregisterData && JSON.stringify(reregisterData, null, 2)}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
              Delete Registration
            </ThemedText>
            <Button
              title={'Delete Registration'}
              accessibilityLabel={'Delete Registration'}
              buttonType={ButtonType.Secondary}
              onPress={onPressDeleteRegistration}
            />
            <ThemedText variant={'caption'}>
              {deleteSuccess}
            </ThemedText>
          </View>
        </ScrollView>
        <View style={styles.controlsContainer}>
          <View style={{ marginVertical: Spacing.md }}>
            <Button
              title={'Use BC Wallet Mode'}
              accessibilityLabel={'Use BC Wallet Mode'}
              buttonType={ButtonType.Primary}
              onPress={onPressMode}
            />
          </View>
          <Button
            title={'Switch Theme'}
            accessibilityLabel={'Switch Theme'}
            buttonType={ButtonType.Secondary}
            onPress={onPressTheme}
          />
        </View>
      </View>
    </TabScreenWrapper>
  )
}

export default Settings
