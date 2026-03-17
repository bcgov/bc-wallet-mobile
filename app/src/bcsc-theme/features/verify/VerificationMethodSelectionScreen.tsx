import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { Spacing } from '@/bcwallet-theme/theme'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, ThemedText, TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import useVerificationMethodModel from './_models/useVerificationMethodModel'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const { handlePressSendVideo, handlePressLiveCall, sendVideoLoading, liveCallLoading, verificationOptions } =
    useVerificationMethodModel({ navigation })

  const [primaryOption, ...remainingOptions] = verificationOptions

  const headingText = useMemo(() => {
    if (primaryOption === DeviceVerificationOption.SEND_VIDEO) {
      return t('BCSC.VerificationMethods.CannotSendVideo')
    }
    if (primaryOption === DeviceVerificationOption.IN_PERSON) {
      return t('BCSC.VerificationMethods.CannotMakeItToServiceBC')
    }
    if (primaryOption === DeviceVerificationOption.LIVE_VIDEO_CALL) {
      return t('BCSC.VerificationMethods.CannotVideoCall')
    }

    logger.error(`Unknown primary verification option: ${primaryOption}`)
    return ''
  }, [primaryOption, t, logger])

  const renderOption = (option: DeviceVerificationOption, borderBottomWidth?: number) => {
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
  }

  return (
    <ScreenWrapper padded={false}>
      {renderOption(primaryOption, 1)}
      <View style={{ marginTop: Spacing.xxl, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <ThemedText variant="headingFour">{headingText}</ThemedText>
      </View>
      {remainingOptions.map((option, index) => {
        const borderBottomWidth = remainingOptions.length === index + 1 ? 1 : undefined
        return renderOption(option, borderBottomWidth)
      })}
    </ScreenWrapper>
  )
}
export default VerificationMethodSelectionScreen
