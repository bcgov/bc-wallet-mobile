import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import ArrowUp from '@assets/img/arrowup.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, Platform } from 'react-native'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

const ARROW_SIZE = 80

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId, fromAppSwitch } = route.params
  const showAppSwitchGuidance = Platform.OS === 'ios' && fromAppSwitch

  const onClose = () => {
    if (fromAppSwitch && Platform.OS === 'android') {
      BackHandler.exitApp() // Closes the app on Android, taking you back to browser
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCStacks.Tab }],
        })
      )
    }
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
    <ScreenWrapper
      controls={controls}
      edges={['bottom', 'left', 'right', 'top']}
      scrollViewContainerStyle={{ gap: Spacing.lg }}
    >
      {showAppSwitchGuidance && (
        <ArrowUp
          height={ARROW_SIZE}
          width={ARROW_SIZE}
          color={ColorPalette.brand.primary}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('BCSC.ManualPairing.AppSwitchArrowLabel')}
          style={{ marginTop: -Spacing.md, marginBottom: Spacing.md }}
        />
      )}
      {fromAppSwitch ? (
        <ThemedText style={{ marginTop: Spacing.md }} variant={'headingThree'}>
          {t('BCSC.ManualPairing.FromAppSwitchCompletionTitle', { serviceName })}
        </ThemedText>
      ) : (
        <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>
      )}
      {showAppSwitchGuidance && (
        <ThemedText style={{ color: ColorPalette.brand.primary }}>
          {t('BCSC.ManualPairing.FromAppSwitchCompletionSubtitle')}
        </ThemedText>
      )}
      {fromAppSwitch ? (
        Platform.OS === 'ios' ? (
          <ThemedText>{t('BCSC.ManualPairing.FromAppSwitchCompletionDescriptionIOS')}</ThemedText>
        ) : (
          <ThemedText>{t('BCSC.ManualPairing.FromAppSwitchCompletionDescriptionAndroid')}</ThemedText>
        )
      ) : (
        <ThemedText>{t('BCSC.ManualPairing.CompletionDescription', { serviceName })}</ThemedText>
      )}
      <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
    </ScreenWrapper>
  )
}

export default ManualPairing
