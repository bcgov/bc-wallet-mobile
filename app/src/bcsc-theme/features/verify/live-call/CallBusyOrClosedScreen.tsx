import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

type CallBusyOrClosedScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CallBusyOrClosed>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.CallBusyOrClosed>
}

const CallBusyOrClosedScreen = ({ navigation, route }: CallBusyOrClosedScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { busy, formattedHours } = route.params
  const serviceHours = formattedHours || t('BCSC.VideoCall.DefaultHours')

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      padding: Spacing.md,
    },
    controlsContainer: {
      padding: Spacing.md,
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    iconContainer: {
      marginBottom: Spacing.lg,
    },
  })

  const onPressSendVideo = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
      })
    )
  }

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('SendVideo')}
      accessibilityLabel={t('BCSC.VideoCall.CallBusyOrClosed.SendVideoInstead')}
      title={t('BCSC.VideoCall.CallBusyOrClosed.SendVideoInstead')}
      onPress={onPressSendVideo}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      scrollViewContainerStyle={styles.contentContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.lg }}>
        {busy ? t('BCSC.VideoCall.CallBusyOrClosed.AllAgentsBusy') : t('BCSC.VideoCall.CallBusyOrClosed.CallUsLater')}
      </ThemedText>

      <ThemedText style={{ marginBottom: Spacing.lg }}>
        {busy
          ? t('BCSC.VideoCall.CallBusyOrClosed.AllAgentsBusyMessage')
          : t('BCSC.VideoCall.CallBusyOrClosed.CurrentlyClosedMessage')}
      </ThemedText>

      <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.sm }}>
        {t('BCSC.VideoCall.CallBusyOrClosed.HoursOfService')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{serviceHours}</ThemedText>

      <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
        {t('BCSC.VideoCall.CallBusyOrClosed.Reminder')}
      </ThemedText>
      <ThemedText>
        {t('BCSC.VideoCall.CallBusyOrClosed.AddCardAgainReminder', {
          date: store.bcsc.deviceCodeExpiresAt?.toLocaleString(t('BCSC.LocaleStringFormat'), {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        })}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default CallBusyOrClosedScreen
