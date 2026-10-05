import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { Button, ButtonType } from '@bifold/core'
import { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
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
  const cancelledRef = useRef(false)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDelayReached(true), CANCEL_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  // Latches for good: cancel navigates away, and a second tap during the transition would run it twice.
  const handleCancel = useCallback(async () => {
    if (cancelledRef.current) {
      return
    }
    cancelledRef.current = true
    setCancelled(true)
    await onCancel()
  }, [onCancel])

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
        onPress={handleCancel}
        disabled={!delayReached || cancelled}
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
