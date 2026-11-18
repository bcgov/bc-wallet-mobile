import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useVerificationPendingActions } from '@/bcsc-theme/hooks/useVerificationPendingActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { isDecidedVerificationStatus } from '@/bcsc-theme/utils/verification-status'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, View } from 'react-native'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

/**
 * Waits for the agent's review of a submitted video. The screen offers no check of its own (by design)
 * and needs none: it notices the decision on focus, whenever the app returns to the foreground,
 * and when the review push lands. Back leaves for Home, whose pending card is where a user asks for a
 * fresh status and is the way back here; Android hardware back belongs to the header's back button
 * (see VerifyStack).
 */
const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { verificationVideoSubmittedAt, verificationRequestStatus } = store.bcscSecure
  const { handleCheckStatus, handleCancelVerification } = useVerificationPendingActions(navigation)

  // Check status when the screen is visible
  useFocusEffect(
    useCallback(() => {
      void handleCheckStatus()
    }, [handleCheckStatus])
  )

  // ...and again whenever the app returns to the foreground while it is: reviews mostly land while the
  // app is in the background
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          void handleCheckStatus()
        }
      })

      return () => {
        subscription.remove()
      }
    }, [handleCheckStatus])
  )

  // The review push reaches this screen through the store: FcmViewModel.handleStatusNotification →
  // VerificationResponseService → useVerificationResponseListener (mounted by VerifyStack) →
  // verificationRequestStatus. A decided status is acted on straight away rather than at the next focus
  useEffect(() => {
    if (navigation.isFocused() && isDecidedVerificationStatus(verificationRequestStatus)) {
      void handleCheckStatus()
    }
  }, [navigation, verificationRequestStatus, handleCheckStatus])

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey(TestIds.verify.pendingReview.chooseAnotherWay)}
        accessibilityLabel={t('BCSC.Steps.ChooseAnotherWayToVerify')}
        title={t('BCSC.Steps.ChooseAnotherWayToVerify')}
        buttonType={ButtonType.Secondary}
        onPress={handleCancelVerification}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.SendVideo.PendingReview.Heading')}</ThemedText>
      <View>
        <ThemedText style={{ fontWeight: 'bold' }}>{t('BCSC.SendVideo.PendingReview.Description1')}</ThemedText>
        {verificationVideoSubmittedAt && (
          <ThemedText>{moment(verificationVideoSubmittedAt).format('dddd MMMM D, YYYY, h:mm a')}</ThemedText>
        )}
      </View>
      <View>
        <ThemedText>{t('BCSC.SendVideo.PendingReview.BulletHeader')}</ThemedText>
        <BulletPoint pointsText={t('BCSC.SendVideo.PendingReview.Bullet1')} />
        <BulletPoint pointsText={t('BCSC.SendVideo.PendingReview.Bullet2')} />
      </View>
      <ThemedText>{t('BCSC.SendVideo.PendingReview.Description2')}</ThemedText>
      <ThemedText>{t('BCSC.SendVideo.PendingReview.Description3')}</ThemedText>
      <ThemedText>{t('BCSC.SendVideo.PendingReview.Description4')}</ThemedText>
    </ScreenWrapper>
  )
}
export default PendingReviewScreen
