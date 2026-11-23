import { RadioListScreen } from '@/bcsc-theme/components/RadioListScreen'
import { usePreferences } from '@/bcsc-theme/storage/hooks'
import { AutoLockTime } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'

export const AutoLockScreen: React.FC = () => {
  const { t } = useTranslation()
  const { autoLockTime, setAutoLockTime } = usePreferences()

  const handleTimeoutChange = (time: number) => {
    void setAutoLockTime(time)
  }

  return (
    <RadioListScreen
      options={[
        {
          title: t('AutoLockTimes.FiveMinutes'),
          value: AutoLockTime.FiveMinutes,
          testID: `auto-lock-time-${AutoLockTime.FiveMinutes}`,
        },
        {
          title: t('AutoLockTimes.ThreeMinutes'),
          value: AutoLockTime.ThreeMinutes,
          testID: `auto-lock-time-${AutoLockTime.ThreeMinutes}`,
        },
        {
          title: t('AutoLockTimes.OneMinute'),
          value: AutoLockTime.OneMinute,
          testID: `auto-lock-time-${AutoLockTime.OneMinute}`,
        },
        ...(__DEV__
          ? [
              {
                title: t('AutoLockTimes.Never'),
                value: AutoLockTime.Never,
                testID: `auto-lock-time-${AutoLockTime.Never}`,
              },
            ]
          : []),
      ]}
      currentValue={autoLockTime}
      onSelect={handleTimeoutChange}
    />
  )
}
