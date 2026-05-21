import { LoadingScreenContent } from '@/bcsc-theme/features/splash-loading/LoadingScreenContent'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useEvidenceUploadModel from './useEvidenceUploadModel'

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend, handleCancel, uploadMessage } = useEvidenceUploadModel(navigation)
  const { t } = useTranslation()
  useEffect(() => {
    handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const controls = (
    <Button
      buttonType={ButtonType.Secondary}
      onPress={handleCancel}
      testID={testIdWithKey('CancelUpload')}
      title={t('Global.Cancel')}
      accessibilityLabel={t('Global.Cancel')}
    />
  )

  return (
    <ScreenWrapper controls={controls} edges={['top', 'bottom', 'left', 'right']}>
      <LoadingScreenContent iconOnTop={false} message={uploadMessage ?? undefined} />
    </ScreenWrapper>
  )
}

export default UploadingScreen
