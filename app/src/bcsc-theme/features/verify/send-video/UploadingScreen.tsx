import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useEvidenceUploadModel from './useEvidenceUploadModel'

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend, uploadMessage, progressPercent } = useEvidenceUploadModel(navigation)
  const { t } = useTranslation()

  useEffect(() => {
    handleSend()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Start once on entry; store updates must not resubmit evidence.
  }, [])

  return (
    <WaitingScreenContent
      message={t('BCSC.SendVideo.UploadProgress.UploadingInformation')}
      statusMessage={uploadMessage ?? t('BCSC.SendVideo.UploadProgress.PreparingVideo')}
      progressPercent={progressPercent}
      testID={testIdWithKey('UploadingScreen')}
    />
  )
}

export default UploadingScreen
