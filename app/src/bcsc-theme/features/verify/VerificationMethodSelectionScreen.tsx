import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import useVerificationMethodModel from './_models/useVerificationMethodModel'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()

  const { handlePressSendVideo, handlePressLiveCall, sendVideoLoading, liveCallLoading, verificationOptions } =
    useVerificationMethodModel({ navigation })

  return (
    <ScreenWrapper padded={false}>
      {verificationOptions
        .map((option, index) => {
          const borderBottomWidth = verificationOptions.length === index + 1 ? 1 : undefined

          if (option === DeviceVerificationOption.LIVE_VIDEO_CALL) {
            return (
              <VerifyMethodActionButton
                key="video_call"
                title={t('BCSC.VerificationMethods.VideoCallTitle')}
                description={t('BCSC.VerificationMethods.VideoCallDescription')}
                icon={'video'}
                onPress={handlePressLiveCall}
                loading={liveCallLoading}
                disabled={liveCallLoading || sendVideoLoading}
                style={{ borderBottomWidth }}
              />
            )
          }

          if (option === DeviceVerificationOption.SEND_VIDEO) {
            return (
              <VerifyMethodActionButton
                key="send_video"
                title={t('BCSC.VerificationMethods.SendVideoTitle')}
                description={t('BCSC.VerificationMethods.SendVideoDescription')}
                icon={'send'}
                onPress={handlePressSendVideo}
                loading={sendVideoLoading}
                disabled={sendVideoLoading || liveCallLoading}
                style={{ borderBottomWidth }}
              />
            )
          }

          if (option === DeviceVerificationOption.IN_PERSON) {
            return (
              <VerifyMethodActionButton
                key="in_person"
                title={t('BCSC.VerificationMethods.InPersonTitle')}
                description={t('BCSC.VerificationMethods.InPersonDescription')}
                icon={'account'}
                onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
                disabled={liveCallLoading || sendVideoLoading}
                style={{ borderBottomWidth }}
              />
            )
          }
          return null
        })
        .filter(Boolean)}
    </ScreenWrapper>
  )
}
export default VerificationMethodSelectionScreen
