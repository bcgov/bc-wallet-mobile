import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Mode } from '@/store'
import useApi from '@bcsc-theme/api/hooks/useApi'
import { ServerStatusResponseData, TermsOfUseResponseData } from '@bcsc-theme/api/hooks/useConfigApi'
import TabScreenWrapper from '@bcsc-theme/components/TabScreenWrapper'
import useDataLoader from '@bcsc-theme/hooks/useDataLoader'
import {
  Button,
  ButtonType,
  LockoutReason,
  ThemedText,
  TOKENS,
  useAuth,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'

// Placeholder for now, not sure if we want to reuse our
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { Spacing, setTheme, themeName } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const { config } = useApi()
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

  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onTermsOfUseError = (error: unknown) => {
    logger.error(`Error loading terms of use: ${error}`)
  }

  const onServerStatusError = (error: unknown) => {
    logger.error(`Error loading server status: ${error}`)
  }

  const {
    load: loadTerms,
    isLoading: termsLoading,
    data: termsData,
    isReady: termsReady,
    error: termsError,
  } = useDataLoader<TermsOfUseResponseData>(() => config.getTermsOfUse(), { onError: onTermsOfUseError })

  const {
    load: loadStatus,
    isLoading: statusLoading,
    data: statusData,
    isReady: statusReady,
    error: statusError,
  } = useDataLoader<ServerStatusResponseData>(() => config.getServerStatus(), { onError: onServerStatusError })

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
          <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
            Server Status
          </ThemedText>
          {statusLoading ? (
            <ActivityIndicator size={'small'} />
          ) : statusError ? (
            <ThemedText variant={'caption'} style={{ color: 'red' }}>
              {`Error loading server status: ${statusError}`}
            </ThemedText>
          ) : statusReady ? (
            <>
              {statusData &&
                Object.entries(statusData).map(([key, value]) => (
                  <View key={key} style={{ marginBottom: Spacing.sm }}>
                    <ThemedText variant={'caption'} style={{ fontWeight: 'bold' }}>
                      {key}
                    </ThemedText>
                    <ThemedText variant={'caption'}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </ThemedText>
                  </View>
                ))}
            </>
          ) : (
            <Button
              title={'Load Server Status'}
              accessibilityLabel={'Load Server Status'}
              buttonType={ButtonType.Secondary}
              onPress={loadStatus}
            />
          )}
          <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
            Terms
          </ThemedText>
          {termsLoading ? (
            <ActivityIndicator size={'small'} />
          ) : termsError ? (
            <ThemedText variant={'caption'} style={{ color: 'red' }}>
              {`Error loading terms of use: ${termsError}`}
            </ThemedText>
          ) : termsReady ? (
            <>
              <View style={{ marginBottom: Spacing.sm }}>
                <ThemedText variant={'caption'} style={{ fontWeight: 'bold' }}>
                  Version
                </ThemedText>
                <ThemedText variant={'caption'}>{termsData?.version}</ThemedText>
              </View>
              <View style={{ marginBottom: Spacing.sm }}>
                <ThemedText variant={'caption'} style={{ fontWeight: 'bold' }}>
                  Date
                </ThemedText>
                <ThemedText variant={'caption'}>{termsData?.date}</ThemedText>
              </View>
              <View style={{ marginBottom: Spacing.sm }}>
                <ThemedText variant={'caption'} style={{ fontWeight: 'bold' }}>
                  HTML
                </ThemedText>
                <ThemedText variant={'caption'} style={{ flexShrink: 1, flexWrap: 'wrap' }}>
                  {termsData?.html}
                </ThemedText>
              </View>
            </>
          ) : (
            <Button
              title={'Load Terms of Use'}
              accessibilityLabel={'Load Terms of Use'}
              buttonType={ButtonType.Secondary}
              onPress={loadTerms}
            />
          )}
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
