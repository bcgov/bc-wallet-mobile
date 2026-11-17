import { RateLimitedAction, RateLimitWaitType } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { useRateLimitWait } from '@/bcsc-theme/state/rate-limit/useRateLimitWait'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const useBirthdateLockoutViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.BirthdateLockout>
) => {
  const { t } = useTranslation()
  const wait = useRateLimitWait(RateLimitedAction.CardAdd)
  const isWaiting = wait.type === RateLimitWaitType.Waiting
  const minutes = isWaiting ? wait.minutes : 0

  // "No time known" and "wait ended" both derive to None; only a wait seen on this screen counts as ended
  const [sawWait, setSawWait] = useState(isWaiting)
  useEffect(() => {
    if (isWaiting) {
      setSawWait(true)
    }
  }, [isWaiting])

  const message = useMemo(() => {
    if (!isWaiting) {
      return sawWait ? t('BCSC.BirthdateLockout.WaitOver') : t('BCSC.BirthdateLockout.Message')
    }

    return minutes === 1
      ? t('BCSC.BirthdateLockout.WaitOneMinute')
      : t('BCSC.BirthdateLockout.WaitMinutes', { minutes })
  }, [isWaiting, minutes, sawWait, t])

  const handleClose = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return { message, handleClose }
}
