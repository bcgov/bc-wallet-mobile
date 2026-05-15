import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScreenWrapper } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import useEvidenceUploadModel from './useEvidenceUploadModel'

type UploadingScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceUploading>
}

const UploadingScreen = ({ navigation }: UploadingScreenProps) => {
  const { handleSend } = useEvidenceUploadModel(navigation)

  useEffect(() => {
    handleSend()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <ScreenWrapper />
}

export default UploadingScreen
