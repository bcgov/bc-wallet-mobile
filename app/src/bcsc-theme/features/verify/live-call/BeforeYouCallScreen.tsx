import { HelpCentreUrl } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import NetInfo, { useNetInfo } from '@react-native-community/netinfo'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type BeforeYouCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.BeforeYouCall>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.BeforeYouCall>
}

const BeforeYouCallScreen = ({ navigation, route }: BeforeYouCallScreenProps) => {
  const { Spacing } = useTheme()
  const { type: networkType, isConnected } = useNetInfo()
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const { formattedHours } = route.params || {}

  // Use the passed formatted hours or fallback to default
  const hoursText = formattedHours || t('BCSC.VideoCall.DefaultHours')
  const isCellular = useMemo(() => networkType === 'cellular' && isConnected === true, [networkType, isConnected])

  const styles = StyleSheet.create({
    controlsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
  })

  const navigateToCamera = () => {
    navigation.navigate(BCSCScreens.TakePhoto, {
      forLiveCall: true,
      deviceSide: 'front',
      cameraInstructions: '',
      cameraLabel: '',
    })
  }

  const onPressContinue = async () => {
    const netInfo = await NetInfo.refresh()

    if (netInfo.type === 'cellular') {
      emitAlert(t('Alerts.DataUseWarning.Title'), t('Alerts.DataUseWarning.Description'), {
        event: AppEventCode.DATA_USE_WARNING,
        actions: [
          {
            text: t('Global.Cancel'),
            style: 'cancel',
          },
          {
            text: t('Alerts.DataUseWarning.Action1'),
            onPress: navigateToCamera,
            style: 'destructive',
          },
        ],
      })
      return
    }

    navigateToCamera()
  }

  const navigateToWebView = useCallback(
    (url: string, title: string) => {
      navigation.navigate(BCSCScreens.VerifyWebView, { url, title })
    },
    [navigation]
  )

  const onPressAssistance = () => {
    navigateToWebView(HelpCentreUrl.VERIFY_CALL, t('HelpCentre.Title'))
  }

  return (
    <ScreenWrapper>
      <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.VideoCall.BeforeYouCallTitle')}
      </ThemedText>
      <ThemedText variant={'headingFour'}>{t('BCSC.VideoCall.WiFiRecommended')}</ThemedText>
      <ThemedText>
        {isCellular ? t('BCSC.VideoCall.CellularNetworkWarning') : ''}
        {t('BCSC.VideoCall.StandardDataCharges')}
      </ThemedText>

      <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
        {t('BCSC.VideoCall.FindPrivatePlace')}
      </ThemedText>
      <ThemedText>{t('BCSC.VideoCall.MakeSureOnlyYou')}</ThemedText>

      <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
        {t('BCSC.VideoCall.CallBusyOrClosed.HoursOfService')}
      </ThemedText>
      <ThemedText>{hoursText}</ThemedText>
      <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
        {t('BCSC.VideoCall.ContactCentrePrivacy')}
      </ThemedText>
      <ThemedText>{t(`BCSC.VideoCall.PrivacyNotice`)}</ThemedText>
      <ThemedText style={{ marginTop: Spacing.md }}>{t(`BCSC.VideoCall.PrivacyContactInfo`)}</ThemedText>

      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('Continue')}
          accessibilityLabel={t('Global.Continue')}
          title={t('Global.Continue')}
          onPress={onPressContinue}
        />
        <Button
          buttonType={ButtonType.Tertiary}
          testID={testIdWithKey('Assistance')}
          accessibilityLabel={t('BCSC.VideoCall.Assistance')}
          title={t('BCSC.VideoCall.Assistance')}
          onPress={onPressAssistance}
        />
      </View>
    </ScreenWrapper>
  )
}
export default BeforeYouCallScreen
