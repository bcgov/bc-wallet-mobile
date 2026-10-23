import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useVerificationPendingActions } from '@/bcsc-theme/hooks/useVerificationPendingActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { VerificationRequestStatus } from '@/constants'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useStore,
  useTheme,
} from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, View } from 'react-native'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

/** The agent has reviewed the request: there is a decision to act on. */
const isDecided = (status?: VerificationRequestStatus) =>
  status === VerificationRequestStatus.VERIFIED || status === VerificationRequestStatus.CANCELLED

/**
 * Waits for the agent's review of a submitted video. A first-time verifier cannot leave this screen (no
 * back arrow, no "Back to home"), so it notices the decision on its own: it checks the request status
 * on focus, whenever the app returns to the foreground, when the review push lands, and on demand via
 * "Check status". Android hardware back belongs to the header's back button (see VerifyStack).
 */
const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { ButtonLoading } = useAnimatedComponents()
  const { verificationVideoSubmittedAt, verificationRequestStatus } = store.bcscSecure
  const { handleCheckStatus, handleCancelVerification, isCheckingStatus } = useVerificationPendingActions(navigation)

  // Check status when the screen is visible
  useFocusEffect(
    useCallback(() => {
      handleCheckStatus()
    }, [handleCheckStatus])
  )

  // ...and again whenever the app returns to the foreground while it is: reviews mostly land while the
  // app is in the background, and a first-time verifier has no other way to pick one up
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          handleCheckStatus()
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
    if (navigation.isFocused() && isDecided(verificationRequestStatus)) {
      handleCheckStatus()
    }
  }, [navigation, verificationRequestStatus, handleCheckStatus])

  const handlePressCheckStatus = useCallback(() => {
    handleCheckStatus({ surfaceErrors: true })
  }, [handleCheckStatus])

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey(TestIds.verify.pendingReview.checkStatus)}
        accessibilityLabel={t('BCSC.Steps.CheckStatus')}
        title={t('BCSC.Steps.CheckStatus')}
        buttonType={ButtonType.Primary}
        onPress={handlePressCheckStatus}
        disabled={isCheckingStatus}
      >
        {isCheckingStatus && <ButtonLoading />}
      </Button>
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
