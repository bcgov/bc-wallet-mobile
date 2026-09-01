import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { LoadingScreenContent } from '@/bcsc-theme/features/splash-loading/LoadingScreenContent'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Spacing } from '@/bcwallet-theme/theme'
import { Button, ButtonType, ScreenWrapper, testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import useEvidenceUploadModel from './useEvidenceUploadModel'

export const CANCEL_BUTTON_DELAY_MS = 10000
const FADE_IN_DURATION = 200

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend, handleCancel, isCancelling, uploadMessage } = useEvidenceUploadModel(navigation)
  const { t } = useTranslation()
  const [canCancel, setCanCancel] = useState(false)

  useEffect(() => {
    handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setCanCancel(true), CANCEL_BUTTON_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [])

  // Kept mounted while hidden so revealing it doesn't shift the content above
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canCancel ? 1 : 0, { duration: FADE_IN_DURATION }),
  }))

  const controls = (
    <Animated.View
      style={controlsStyle}
      pointerEvents={canCancel ? 'auto' : 'none'}
      accessibilityElementsHidden={!canCancel}
      importantForAccessibility={canCancel ? 'auto' : 'no-hide-descendants'}
    >
      <ControlContainer>
        <Button
          buttonType={ButtonType.Secondary}
          onPress={handleCancel}
          disabled={isCancelling}
          testID={testIdWithKey('CancelUpload')}
          title={t('Global.Cancel')}
          accessibilityLabel={t('Global.Cancel')}
        />
      </ControlContainer>
    </Animated.View>
  )

  return (
    <ScreenWrapper
      scrollViewContainerStyle={{ padding: Spacing.lg }}
      padded={false}
      controls={controls}
      edges={['top', 'bottom', 'left', 'right']}
      scrollable={false}
    >
      <LoadingScreenContent iconOnTop={false} message={uploadMessage ?? undefined} />
    </ScreenWrapper>
  )
}

export default UploadingScreen
