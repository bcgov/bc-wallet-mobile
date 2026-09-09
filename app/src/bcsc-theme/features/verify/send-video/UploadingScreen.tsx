import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import useEvidenceUploadModel from './useEvidenceUploadModel'

const CANCEL_BUTTON_DELAY_MS = 10000
const FADE_IN_DURATION = 200

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend, handleCancel, isCancelling, uploadMessage, progressPercent } = useEvidenceUploadModel(navigation)
  const { t } = useTranslation()
  const [canCancel, setCanCancel] = useState(false)

  useEffect(() => {
    handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Start once on entry; store updates must not resubmit evidence.
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setCanCancel(true), CANCEL_BUTTON_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: withTiming(canCancel ? 1 : 0, { duration: FADE_IN_DURATION }),
  }))

  // Reserve the button's space so the illustration does not move when Cancel appears (#4585).
  const controls = (
    <Animated.View
      style={controlsStyle}
      pointerEvents={canCancel ? 'auto' : 'none'}
      accessibilityElementsHidden={!canCancel}
      importantForAccessibility={canCancel ? 'auto' : 'no-hide-descendants'}
    >
      <Button
        buttonType={ButtonType.Secondary}
        onPress={handleCancel}
        disabled={!canCancel || isCancelling}
        testID={testIdWithKey(TestIds.verify.evidenceUploading.cancelUpload)}
        title={t('Global.Cancel')}
        accessibilityLabel={t('Global.Cancel')}
      />
    </Animated.View>
  )

  return (
    <WaitingScreenContent
      message={t('BCSC.SendVideo.UploadProgress.UploadingInformation')}
      statusMessage={uploadMessage ?? t('BCSC.SendVideo.UploadProgress.PreparingVideo')}
      progressPercent={progressPercent}
      testID={testIdWithKey(TestIds.verify.evidenceUploading.screen)}
      controls={controls}
    />
  )
}

export default UploadingScreen
