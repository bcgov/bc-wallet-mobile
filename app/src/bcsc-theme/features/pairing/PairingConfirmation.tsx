import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import ArrowUp from '@assets/img/arrowup.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Platform } from 'react-native'
import { moveAppToBackground } from 'react-native-bcsc-core'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

const ARROW_SIZE = 80

type PairingConfirmationProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const PairingConfirmation: React.FC<PairingConfirmationProps> = ({ navigation, route }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId, fromAppSwitch } = route.params
  const showIOSAppSwitchGuide = Platform.OS === 'ios' && fromAppSwitch

  const resetToHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab }],
      })
    )
  }, [navigation])

  useEffect(() => {
    if (!fromAppSwitch) {
      return
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && fromAppSwitch) {
        resetToHome()
      }
    })

    return subscription.remove
  }, [resetToHome, fromAppSwitch])

  const onClose = () => {
    if (fromAppSwitch && Platform.OS === 'android') {
      // Returns to the browser without finishing the Activity, as BackHandler.exitApp can
      moveAppToBackground().catch(resetToHome)
    } else {
      resetToHome()
    }
  }

  const controls = !showIOSAppSwitchGuide ? (
    <ControlContainer>
      <Button
        title={t('Global.Close')}
        buttonType={ButtonType.Primary}
        testID={testIdWithKey(TestIds.main.pairing.confirmationClose)}
        accessibilityLabel={t('Global.Close')}
        onPress={onClose}
      />
    </ControlContainer>
  ) : undefined

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['bottom', 'left', 'right', 'top']}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
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

      <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>

      <ThemedText>{t('BCSC.ManualPairing.CompletionDescription', { serviceName })}</ThemedText>

      <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
    </ScreenWrapper>
  )
}

export default PairingConfirmation
