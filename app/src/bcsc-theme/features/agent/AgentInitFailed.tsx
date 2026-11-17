import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

interface AgentInitFailedProps {
  onRetry: () => void
  testID?: string
}

/**
 * What a gated screen shows when the BCSC agent failed to start: the failure message and a Retry that
 * runs the start-up again. Shared by the agent gates so every gated screen fails the same way.
 */
const AgentInitFailed: React.FC<AgentInitFailedProps> = ({ onRetry, testID }) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

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
        onPress={onRetry}
        accessibilityLabel={t('Init.Retry')}
        testID={testIdWithKey(TestIds.common.agentRetry)}
      />
    </View>
  )
}

export default AgentInitFailed
