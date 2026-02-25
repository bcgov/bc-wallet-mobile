import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import ArrowUp from '@assets/img/arrowup.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId, fromAppSwitch } = route.params
  const showAppSwitchGuidance = Platform.OS === 'ios' && fromAppSwitch

  const onClose = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab }],
      })
    )
  }

  const controls = !showAppSwitchGuidance ? (
    <Button
      title={t('Global.Close')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('Close')}
      accessibilityLabel={t('Global.Close')}
      onPress={onClose}
    />
  ) : undefined

  return (
    <ScreenWrapper controls={controls}>
      {showAppSwitchGuidance && (
        <ArrowUp
          height={80}
          width={80}
          color={ColorPalette.brand.primary}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('BCSC.ManualPairing.AppSwitchArrowLabel')}
          style={{ marginTop: -Spacing.md, marginBottom: Spacing.md }}
        />
      )}
      <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>
      {showAppSwitchGuidance && (
        <ThemedText style={{ marginTop: Spacing.sm, color: ColorPalette.brand.primary }}>
          {t('BCSC.ManualPairing.CompletionSubtitle')}
        </ThemedText>
      )}
      <ThemedText style={{ marginVertical: Spacing.lg }}>
        {t('BCSC.ManualPairing.CompletionDescription', { serviceName })}
      </ThemedText>
      <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
    </ScreenWrapper>
  )
}

export default ManualPairing
