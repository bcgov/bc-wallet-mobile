import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useVerificationPendingActions } from '@/bcsc-theme/hooks/useVerificationPendingActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, View } from 'react-native'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PendingReview>
}

const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { verificationVideoSubmittedAt } = store.bcscSecure
  const { handleCheckStatus, handleCancelVerification } = useVerificationPendingActions(navigation)
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS, payload: [VerificationStatus.UNVERIFIED] })
        return true
      })
      return subscription.remove
    }, [dispatch])
  )

  // Check status when the screen mounts
  useEffect(() => {
    handleCheckStatus()
  }, [handleCheckStatus])

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey('ChooseAnotherWayToVerify')}
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
