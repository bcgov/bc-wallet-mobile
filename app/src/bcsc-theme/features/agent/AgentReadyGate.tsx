import { useTheme } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useBCSCAgent } from './BCSCAgentProvider'

type Props = PropsWithChildren<{ testID?: string }>

/**
 * Renders children only after the BCSC agent is ready. While the agent boots
 * (or after navigation state restores onto a screen that depends on Bifold's
 * agent context) a centered ActivityIndicator stands in. Lets us register
 * Bifold screens in the navigator without risking a crash if they mount
 * before the providers in BifoldScope are wired up.
 */
const AgentReadyGate: React.FC<Props> = ({ children, testID }) => {
  const { agent } = useBCSCAgent()
  const { ColorPalette } = useTheme()

  if (!agent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
        <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
      </View>
    )
  }

  return <>{children}</>
}

export default AgentReadyGate
