import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { Spacing } from '@/bcwallet-theme/theme'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, testIdWithKey, ThemedText } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'
import useVerificationMethodModel from './_models/useVerificationMethodModel'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'
import ServicePeriodList from './live-call/components/ServicePeriodList'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { t } = useTranslation()

  const {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    hoursLoading,
    verificationOptions,
    formattedHours,
  } = useVerificationMethodModel({ navigation })

  const [primaryOption, ...remainingOptions] = verificationOptions

  const renderOption = (option: DeviceVerificationOption) => {
    if (option === DeviceVerificationOption.SEND_VIDEO) {
      return (
        <VerifyMethodActionButton
          key="send_video"
          title={t('BCSC.VerificationMethods.SendVideoTitle')}
          description={t('BCSC.VerificationMethods.SendVideoDescription')}
          icon={'video-outline'}
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
          icon={'account-outline'}
          onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
          disabled={liveCallLoading || sendVideoLoading}
        />
      )
    }

    if (option === DeviceVerificationOption.LIVE_VIDEO_CALL) {
      return (
        <VerifyMethodActionButton
          key="video_call"
          title={t('BCSC.VerificationMethods.VideoCallTitle')}
          description={t('BCSC.VerificationMethods.VideoCallDescription')}
          icon={'face-agent'}
          onPress={handlePressLiveCall}
          loading={liveCallLoading}
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
          {"We need to make sure you're a real person. How would you like to proceed?"}
        </ThemedText>
      </View>
      {renderOption(primaryOption)}
      {remainingOptions.map((option) => {
        return renderOption(option)
      })}

      <View style={{ marginHorizontal: Spacing.md }}>
        <ThemedText
          variant={'headingFour'}
          style={{ marginTop: Spacing.md }}
          testID={testIdWithKey('HoursOfServiceTitle')}
        >
          {t('BCSC.VideoCall.CallBusyOrClosed.HoursOfService')}
        </ThemedText>
        {hoursLoading ? (
          <ActivityIndicator style={{ marginTop: Spacing.sm }} />
        ) : (
          formattedHours && <ServicePeriodList items={formattedHours} />
        )}
      </View>
    </ScreenWrapper>
  )
}
export default VerificationMethodSelectionScreen
