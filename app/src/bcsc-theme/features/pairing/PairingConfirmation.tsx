import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import ArrowUp from '@assets/img/arrowup.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, BackHandler, Platform } from 'react-native'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

const ARROW_SIZE = 80

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId, fromAppSwitch } = route.params
  const showAppSwitchGuidance = Platform.OS === 'ios' && fromAppSwitch
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    if (!showAppSwitchGuidance) {
      return
    }

    // On iOS, when coming from an app switch, we want to automatically navigate the user back
    // to the home screen when they return to the app (since they've completed the action in
    // the other app)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current
      appStateRef.current = nextAppState
      if ((prev === 'inactive' || prev === 'background') && nextAppState === 'active') {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCStacks.Tab }],
          })
        )
      }
    })

    return subscription.remove
  }, [showAppSwitchGuidance, navigation])

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
      scrollViewContainerStyle={{ gap: Spacing.md }}
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
        <ThemedText style={{ marginTop: showAppSwitchGuidance ? undefined : Spacing.md }} variant={'headingThree'}>
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
