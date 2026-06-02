import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React, { ComponentType, PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'

import { useBCSCAgent } from './BCSCAgentProvider'

type Props = PropsWithChildren<{ testID?: string }>

/**
 * Renders children only after the BCSC agent is ready. While the agent boots
 * (or after navigation state restores onto a screen that depends on Bifold's
 * agent context) a centered ActivityIndicator stands in. If agent
 * initialization fails the agent never becomes ready, so instead of spinning
 * forever we surface the failure with a retry affordance. Lets us register
 * screens that depend on Bifold's connection/agent context in the navigator
 * without risking a crash if they mount before the providers in BifoldScope
 * are wired up.
 */
const AgentReadyGate: React.FC<Props> = ({ children, testID }) => {
  const { agent, error, retry } = useBCSCAgent()
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  if (!agent) {
    if (error) {
      return (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.lg }}
          testID={testID}
        >
          <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
            {t('Init.Failed')}
          </ThemedText>
          <Button
            title={t('Init.Retry')}
            buttonType={ButtonType.Primary}
            onPress={retry}
            accessibilityLabel={t('Init.Retry')}
            testID={testIdWithKey('AgentRetry')}
          />
        </View>
      )
    }

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
        <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
      </View>
    )
  }

  return <>{children}</>
}

/**
 * Wraps a screen component in {@link AgentReadyGate} so it only mounts once the
 * BCSC agent is ready. Use for screens that call Bifold connection hooks
 * (e.g. useConnections / useConnectionById), which require providers that
 * BifoldScope only mounts after the agent resolves. Build the wrapped component
 * once at module scope so its identity stays stable and React Navigation does
 * not remount it on every render.
 */
export function withAgentReadyGate<P extends object>(Wrapped: ComponentType<P>, loadingTestID?: string): React.FC<P> {
  const Scoped: React.FC<P> = (props) => (
    <AgentReadyGate testID={loadingTestID}>
      <Wrapped {...props} />
    </AgentReadyGate>
  )
  Scoped.displayName = `withAgentReadyGate(${Wrapped.displayName ?? Wrapped.name ?? 'Component'})`
  return Scoped
}

export default AgentReadyGate
