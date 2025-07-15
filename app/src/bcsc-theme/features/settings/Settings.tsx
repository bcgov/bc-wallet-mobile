import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Mode } from '@/store'
import useApi from '@bcsc-theme/api/hooks/useApi'
import { ServerStatusResponseData, TermsOfUseResponseData } from '@bcsc-theme/api/hooks/useConfigApi'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import useDataLoader from '@bcsc-theme/hooks/useDataLoader'
import { Button, ButtonType, LockoutReason, TOKENS, useAuth, useServices, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import SampleApiDisplay from './components/SampleApiDisplay'

// Placeholder for now, not sure if we want to reuse our
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { Spacing, setTheme, themeName } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const { config, evidence, user } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
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
  const evidenceStart = useDataLoader<any>(
    async () => {
      if (!store.bcsc.deviceCode) {
        throw new Error('Device code is not available. Something went wrong.')
      }
      // need to store id and SHA! for later
      const response = await evidence.createVerificationRequest()
      dispatch({ type: BCDispatchAction.UPDATE_VERIFICATION_REQUEST, payload: [response] })
      return response
    },
    {
      onError: (error: unknown) => logger.error(`Error loading: ${error}`),
    }
  )

  const deleteRequest = useDataLoader<any>(
    async () => {
      if (store.bcsc.verificationRequestId && store.bcsc.deviceCode) {
        await evidence.cancelVerificationRequest(store.bcsc.verificationRequestId)

        return 'DELETED REQUEST FOR ID: ' + store.bcsc.verificationRequestId
      } else {
        return 'No ID found to delete'
      }
    },
    {
      onError: (error: unknown) => logger.error(`Error loading: ${error}`),
    }
  )

  const userAccount = useDataLoader<any>(() => user.getUserInfo(), {
    onError: (error: unknown) => logger.error(`Error loading: ${error}`),
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

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <SampleApiDisplay<TermsOfUseResponseData> dataLoader={termsDataLoader} title={'Terms of Use'} />
          <SampleApiDisplay<ServerStatusResponseData> dataLoader={serverStatusDataLoader} title={'Server Status'} />
          <SampleApiDisplay<UserInfoResponseData> dataLoader={userAccount} title={'User Account'} />
          <SampleApiDisplay<any> dataLoader={evidenceStart} title={'Start Evidence'} />
          <SampleApiDisplay<any> dataLoader={deleteRequest} title={'Delete Verification Request'} />
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
