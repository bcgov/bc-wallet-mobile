import { TOKENS, useServices } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCAccountProvider } from '../contexts/BCSCAccountContext'
import { BCSCActivityProvider } from '../contexts/BCSCActivityContext'
import { BCSCIdTokenProvider } from '../contexts/BCSCIdTokenContext'
import { LoadingScreen } from '../contexts/BCSCLoadingContext'
import { SystemCheckSessionProvider } from '../contexts/SystemCheckSessionContext'
import BCSCAgentProvider from '../features/agent/BCSCAgentProvider'
import { useFcmService } from '../features/fcm'
import { useCardStatus } from '../hooks/useCardStatus'
import { useAccountPhase } from '../state/account/useAccountPhase'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import AuthStack from './AuthStack'
import BCSCMainStack from './MainStack'
import OnboardingStack from './OnboardingStack'
import { useRootStackViewModel } from './useRootStackViewModel'
import VerifyStack from './VerifyStack'

const Root = createStackNavigator<BCSCRootStackParams>()

/** The root's only route until state, API client and account are ready. */
const AppStartupLoadingScreen: React.FC = () => {
  const { t } = useTranslation()

  return <LoadingScreen message={t('BCSC.Loading.AppStartup')} />
}

// Keeps FcmViewModel in sync with card expiry so it can drop challenges for expired users, and logs the
// card expiry phase when it changes (rendered once, so one line per change).
// Must live inside BCSCAccountProvider.
const FcmCardExpirySync: React.FC = () => {
  const { isExpired } = useCardStatus()
  const fcmService = useFcmService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { phase } = useAccountPhase()

  useEffect(() => {
    fcmService.viewModel.setCardExpired(isExpired)
  }, [isExpired, fcmService.viewModel])

  useEffect(() => {
    logger.info(`[RootStack] Card expiry phase: ${phase}`)
  }, [phase, logger])

  return null
}

/**
 * The root navigator. It registers exactly one route, the current phase's, so a phase change swaps the
 * route and React Navigation animates the swap like a `replace`. Which phase, and how its entry animates,
 * is decided by {@link useRootStackViewModel}; the session providers above the route are enabled for the
 * signed-in phases only.
 */
const BCSCRootStack: React.FC = () => {
  const { phase, transition, inSession, isVerified, verifyStackKey, showVerifyPrompt, onVerifyPromptAnswered } =
    useRootStackViewModel()
  // The main stack reads this at mount: a stack the root cuts in shows its wait at once
  const enteredByCut = transition.animationEnabled === false

  return (
    <BCSCAgentProvider enabled={inSession}>
      <BCSCAccountProvider enabled={inSession}>
        <SystemCheckSessionProvider enabled={inSession}>
          {/* gestureEnabled stays explicit: its default follows animationEnabled */}
          <Root.Navigator screenOptions={{ headerShown: false, gestureEnabled: false, ...transition }}>
            {phase === 'loading' ? (
              <Root.Screen name={BCSCScreens.RootLoading} component={AppStartupLoadingScreen} />
            ) : null}
            {phase === 'onboarding' ? <Root.Screen name={BCSCStacks.Onboarding} component={OnboardingStack} /> : null}
            {phase === 'auth' ? <Root.Screen name={BCSCStacks.Auth} component={AuthStack} /> : null}
            {phase === 'recovery' ? (
              <Root.Screen name={BCSCStacks.Verify}>
                {() => (
                  <BCSCActivityProvider>
                    <VerifyStack />
                  </BCSCActivityProvider>
                )}
              </Root.Screen>
            ) : null}
            {phase === 'verify' ? (
              // A key change drops the route and registers it afresh, so VerifyStack re-evaluates its first step
              <Root.Screen name={BCSCStacks.Verify} navigationKey={verifyStackKey}>
                {() => (
                  <BCSCActivityProvider>
                    <VerifyStack showVerifyPrompt={showVerifyPrompt} onVerifyPromptAnswered={onVerifyPromptAnswered} />
                  </BCSCActivityProvider>
                )}
              </Root.Screen>
            ) : null}
            {phase === 'main' ? (
              <Root.Screen name={BCSCStacks.Main}>
                {() => (
                  <BCSCActivityProvider>
                    <FcmCardExpirySync />
                    {isVerified ? (
                      <BCSCIdTokenProvider>
                        <BCSCMainStack enteredByCut={enteredByCut} />
                      </BCSCIdTokenProvider>
                    ) : (
                      <BCSCMainStack enteredByCut={enteredByCut} />
                    )}
                  </BCSCActivityProvider>
                )}
              </Root.Screen>
            ) : null}
          </Root.Navigator>
        </SystemCheckSessionProvider>
      </BCSCAccountProvider>
    </BCSCAgentProvider>
  )
}

export default BCSCRootStack
