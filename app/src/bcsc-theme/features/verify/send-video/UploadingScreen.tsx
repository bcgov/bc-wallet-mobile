import { CancellableWaitingScreen } from '@/bcsc-theme/features/verify/components/CancellableWaitingScreen'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useEvidenceUploadModel from './useEvidenceUploadModel'

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend, handleCancel, uploadMessage, progressPercent } = useEvidenceUploadModel(navigation)
  const { t } = useTranslation()

  useEffect(() => {
    handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Start once on entry; store updates must not resubmit evidence.
  }, [])

  return (
    <CancellableWaitingScreen
      message={t('BCSC.SendVideo.UploadProgress.UploadingInformation')}
      statusMessage={uploadMessage ?? t('BCSC.SendVideo.UploadProgress.PreparingVideo')}
      progressPercent={progressPercent}
      testID={testIdWithKey(TestIds.verify.evidenceUploading.screen)}
      onCancel={handleCancel}
      cancelTestID={testIdWithKey(TestIds.verify.evidenceUploading.cancelUpload)}
    />
  )
}

export default UploadingScreen
