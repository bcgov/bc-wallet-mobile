import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type CallBusyOrClosedScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.CallBusyOrClosed>
}

const CallBusyOrClosedScreen = ({ navigation, route }: CallBusyOrClosedScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { busy, formattedHours } = route.params
  const serviceHours = formattedHours || t('Unified.VideoCall.DefaultHours')

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      gap: Spacing.sm,
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

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.lg }}>
          {busy ? t('Unified.VideoCall.AllAgentsBusy') : t('Unified.VideoCall.CallUsLater')}
        </ThemedText>

        <ThemedText style={{ marginBottom: Spacing.lg }}>
          {busy ? t('Unified.VideoCall.AllAgentsBusyMessage') : t('Unified.VideoCall.CurrentlyClosedMessage')}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.sm }}>
          {t('Unified.VideoCall.HoursOfService')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>{serviceHours}</ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          {t('Unified.VideoCall.Reminder')}
        </ThemedText>
        <ThemedText>
          {t('Unified.VideoCall.AddCardAgainReminder', {
            date: store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
          })}
        </ThemedText>
      </View>

      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('SendVideo')}
          accessibilityLabel={t('Unified.VideoCall.SendVideoInstead')}
          title={t('Unified.VideoCall.SendVideoInstead')}
          onPress={onPressSendVideo}
        />
      </View>
    </SafeAreaView>
  )
}

export default CallBusyOrClosedScreen
