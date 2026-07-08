import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { useLeaveVerification } from '@/bcsc-theme/hooks/useLeaveVerification'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BLUE_LIGHT } from '@/theme/light'

import { Button, ButtonType, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet } from 'react-native'

type SuccessfullySentScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SuccessfullySent>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.SuccessfullySent>
}

const SuccessfullySentScreen = ({ route }: SuccessfullySentScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const leaveVerification = useLeaveVerification()

  // The API supplies only the turnaround tail (e.g. "within 2 business days"); the screen wraps it in
  // the full sentence, falling back to a default tail when the API omits it.
  const turnaround = route.params?.avgTurnaroundTimeMessage || t('BCSC.SendVideo.SuccessfullySent.DefaultTurnaround')
  const reviewTurnaround = t('BCSC.SendVideo.SuccessfullySent.Description2', { turnaround })

  const styles = StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
  })

  // Disable hardware back button on Android
  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return subscription.remove
  })

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey(t('BCSC.SendVideo.SuccessfullySent.ButtonText'))}
        accessibilityLabel={t('BCSC.SendVideo.SuccessfullySent.ButtonText')}
        title={t('BCSC.SendVideo.SuccessfullySent.ButtonText')}
        buttonType={ButtonType.Primary}
        onPress={() => leaveVerification()}
      />
    </ControlContainer>
  )
  return (
    <ScreenWrapper
      controls={controls}
      padded={false}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.contentContainer}
    >
      <StatusDetails
        title={t('BCSC.SendVideo.SuccessfullySent.Heading')}
        description={t('BCSC.SendVideo.SuccessfullySent.Description1')}
        bullets={[t('BCSC.SendVideo.SuccessfullySent.Bullet1'), t('BCSC.SendVideo.SuccessfullySent.Bullet2')]}
        description2={reviewTurnaround}
        description3={t('BCSC.SendVideo.SuccessfullySent.Description3')}
        iconColor={BLUE_LIGHT}
        iconSize={150}
      />
    </ScreenWrapper>
  )
}
export default SuccessfullySentScreen
