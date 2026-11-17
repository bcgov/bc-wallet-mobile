import { TestIds } from '@/test-ids/registry'
import { ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'

const TransferAgeRestrictionScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  return (
    <ScreenWrapper
      padded={false}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={{ padding: Spacing.md }}
    >
      <ThemedText variant={'headingTwo'} testID={testIdWithKey(TestIds.main.transferAgeRestriction.title)}>
        {t('BCSC.AgeRestrictedTransfer.Title')}
      </ThemedText>
      <ThemedText>{t('BCSC.AgeRestrictedTransfer.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default TransferAgeRestrictionScreen
