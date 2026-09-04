import { RadioListScreen } from '@/bcsc-theme/components/RadioListScreen'
import { BCState } from '@/store'
import { DispatchAction, ProofRequestExpirationTime, useStore } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'

export const ProofRequestExpirationScreen: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const currentExpirationMs = store.preferences.proofRequestExpirationMs ?? ProofRequestExpirationTime.FortyEightHours

  const handleExpirationChange = (valueMs: number) => {
    dispatch({
      type: DispatchAction.PROOF_REQUEST_EXPIRATION_TIME,
      payload: [valueMs],
    })
  }

  return (
    <RadioListScreen
      options={[
        {
          title: t('Developer.ProofRequestExpirationTimes.TwoMinutes'),
          value: ProofRequestExpirationTime.TwoMinutes,
          testID: `proof-request-expiration-${ProofRequestExpirationTime.TwoMinutes}`,
        },
        {
          title: t('Developer.ProofRequestExpirationTimes.OneHour'),
          value: ProofRequestExpirationTime.OneHour,
          testID: `proof-request-expiration-${ProofRequestExpirationTime.OneHour}`,
        },
        {
          title: t('Developer.ProofRequestExpirationTimes.FortyEightHours'),
          value: ProofRequestExpirationTime.FortyEightHours,
          testID: `proof-request-expiration-${ProofRequestExpirationTime.FortyEightHours}`,
        },
        {
          title: t('Developer.ProofRequestExpirationTimes.SevenDays'),
          value: ProofRequestExpirationTime.SevenDays,
          testID: `proof-request-expiration-${ProofRequestExpirationTime.SevenDays}`,
        },
        {
          title: t('Developer.ProofRequestExpirationTimes.Never'),
          value: ProofRequestExpirationTime.Never,
          testID: `proof-request-expiration-${ProofRequestExpirationTime.Never}`,
        },
      ]}
      currentValue={currentExpirationMs}
      onSelect={handleExpirationChange}
    />
  )
}
