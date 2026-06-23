import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { View } from 'react-native'

const STEP_KEYS = [
  'BCSC.TransferInstructions.Step1',
  'BCSC.TransferInstructions.Step2',
  'BCSC.TransferInstructions.Step3',
] as const

const TransferInstructionsScreen: React.FC = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.TransferInstructions.ScanQRCode')}
      accessibilityLabel={t('BCSC.TransferInstructions.ScanQRCode')}
      testID={testIdWithKey('ScanQRCode')}
      onPress={() => {
        navigation.navigate(BCSCScreens.TransferAccountQRScan)
      }}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.TransferInstructions.Title')}</ThemedText>

      {STEP_KEYS.map((stepKey, index) => (
        // Numbered list with a hanging indent: the number sits in a gutter and the wrapped
        // step text aligns to the right of it.
        <View key={stepKey} style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <ThemedText variant={'bold'}>{`${index + 1}.`}</ThemedText>
          <ThemedText style={{ flex: 1 }}>
            <Trans i18nKey={stepKey} components={{ b: <ThemedText variant={'bold'} /> }} t={t} />
          </ThemedText>
        </View>
      ))}
    </ScreenWrapper>
  )
}

export default TransferInstructionsScreen
