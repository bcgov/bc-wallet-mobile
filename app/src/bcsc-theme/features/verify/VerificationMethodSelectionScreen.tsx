import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { Spacing } from '@/bcwallet-theme/theme'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, ThemedText } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import useVerificationMethodModel from './_models/useVerificationMethodModel'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()

  const { handlePressSendVideo, handlePressLiveCall, sendVideoLoading, liveCallLoading, verificationOptions } =
    useVerificationMethodModel({ navigation })

  const [primaryOption, ...remainingOptions] = verificationOptions

  // const headingText = useMemo(() => {
  //   if (primaryOption === DeviceVerificationOption.SEND_VIDEO) {
  //     return t('BCSC.VerificationMethods.CannotSendVideo')
  //   }
  //   if (primaryOption === DeviceVerificationOption.IN_PERSON) {
  //     return t('BCSC.VerificationMethods.CannotMakeItToServiceBC')
  //   }
  //   if (primaryOption === DeviceVerificationOption.LIVE_VIDEO_CALL) {
  //     return t('BCSC.VerificationMethods.CannotVideoCall')
  //   }

  //   logger.error(`Unknown primary verification option: ${primaryOption}`)
  //   return ''
  // }, [primaryOption, t, logger])

  const renderOption = (option: DeviceVerificationOption) => {
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
        />
      )
    }

    return null
  }

  return (
    <ScreenWrapper padded={false}>
      <View
        style={{
          marginTop: Spacing.xxl,
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.sm,
          alignItems: 'center',
        }}
      >
        <ThemedText variant="headingFour">{'Choose how to verify'}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>
          {"We need to make sure you're a real person. How would you like to procede?"}
        </ThemedText>
      </View>
      {renderOption(primaryOption)}
      {remainingOptions.map((option) => {
        return renderOption(option)
      })}
    </ScreenWrapper>
  )
}
export default VerificationMethodSelectionScreen
