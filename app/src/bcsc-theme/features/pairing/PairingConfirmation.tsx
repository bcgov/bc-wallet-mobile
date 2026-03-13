import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import ArrowUp from '@assets/img/arrowup.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, BackHandler, Platform } from 'react-native'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

const ARROW_SIZE = 80

type PairingConfirmationProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const PairingConfirmation: React.FC<PairingConfirmationProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId, fromAppSwitch } = route.params
  const showIOSAppSwitchGuide = Platform.OS === 'ios' && fromAppSwitch

  useEffect(() => {
    if (!showIOSAppSwitchGuide) {
      return
    }

    // On iOS, if the user backgrounds the app while on this screen -> navigate back to home screen
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && showIOSAppSwitchGuide) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCStacks.Tab }],
          })
        )
      }
    })

    return subscription.remove
  }, [navigation, showIOSAppSwitchGuide])

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

  const controls = !showIOSAppSwitchGuide ? (
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
      scrollViewContainerStyle={{ gap: Spacing.md }}
    >
      {showIOSAppSwitchGuide && (
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
        <ThemedText style={{ marginTop: showIOSAppSwitchGuide ? undefined : Spacing.md }} variant={'headingThree'}>
          {t('BCSC.ManualPairing.FromAppSwitchCompletionTitle', { serviceName })}
        </ThemedText>
      ) : (
        <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>
      )}
      {showIOSAppSwitchGuide && (
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

export default PairingConfirmation
