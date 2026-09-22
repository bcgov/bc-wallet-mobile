import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { Button, ButtonType, usePreventDoublePress } from '@bifold/core'
import { ComponentProps, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

const CANCEL_DELAY_MS = 10000

type CancellableWaitingScreenProps = Omit<
  ComponentProps<typeof WaitingScreenContent>,
  'controls' | 'supportingMessage'
> & {
  onCancel: () => void | Promise<void>
  cancelTestID: string
  delayedMessage?: string
}

export const CancellableWaitingScreen = ({
  onCancel,
  cancelTestID,
  delayedMessage,
  ...contentProps
}: CancellableWaitingScreenProps) => {
  const { t } = useTranslation()
  const [delayReached, setDelayReached] = useState(false)
  const { isPressing, preventDoublePress } = usePreventDoublePress()

  useEffect(() => {
    const timeout = setTimeout(() => setDelayReached(true), CANCEL_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  // Reserve space so revealing Cancel does not shift the waiting layout (#4513, #4585).
  const controls = (
    <View
      style={{ opacity: delayReached ? 1 : 0 }}
      pointerEvents={delayReached ? 'auto' : 'none'}
      accessibilityElementsHidden={!delayReached}
      importantForAccessibility={delayReached ? 'auto' : 'no-hide-descendants'}
    >
      <Button
        buttonType={ButtonType.Secondary}
        onPress={preventDoublePress(onCancel)}
        disabled={!delayReached || isPressing}
        title={t('Global.Cancel')}
        accessibilityLabel={t('Global.Cancel')}
        testID={cancelTestID}
      />
    </View>
  )

  return (
    <WaitingScreenContent
      {...contentProps}
      supportingMessage={delayReached ? delayedMessage : undefined}
      controls={controls}
    />
  )
}
