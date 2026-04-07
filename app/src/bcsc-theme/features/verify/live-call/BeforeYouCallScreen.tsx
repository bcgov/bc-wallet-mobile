import { useAlerts } from '@/hooks/useAlerts'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useTheme,
} from '@bifold/core'
import NetInfo, { useNetInfo } from '@react-native-community/netinfo'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import ServicePeriodList from './components/ServicePeriodList'

type BeforeYouCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.BeforeYouCall>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.BeforeYouCall>
}

const BeforeYouCallScreen = ({ navigation, route }: BeforeYouCallScreenProps) => {
  const { ButtonLoading } = useAnimatedComponents()
  const { Spacing } = useTheme()
  const { type: networkType, isConnected } = useNetInfo()
  const { t } = useTranslation()
  const { dataUseWarningAlert } = useAlerts(navigation)
  const { formattedHours } = route.params
  const [isWaitingForPermissions, setIsWaitingForPermissions] = useState(false)

  const isCellular = useMemo(() => networkType === 'cellular' && isConnected === true, [networkType, isConnected])

  const styles = StyleSheet.create({
    controlsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
  })

  const onPressContinue = async () => {
    setIsWaitingForPermissions(true)
    const netInfo = await NetInfo.refresh()

    if (netInfo.type === 'cellular') {
      dataUseWarningAlert()
      return
    }

    navigation.navigate(BCSCScreens.TakePhoto, {
      forLiveCall: true,
      deviceSide: 'front',
      cameraInstructions: '',
      cameraLabel: '',
    })
    setIsWaitingForPermissions(false)
  }

  const onPressAssistance = () => {
    navigation.navigate(BCSCScreens.VerifyContactUs)
  }

  return (
    <ScreenWrapper>
      <ThemedText
        variant={'headingTwo'}
        style={{ marginBottom: Spacing.md }}
        testID={testIdWithKey('BeforeYouCallTitle')}
      >
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

      <ThemedText
        variant={'headingFour'}
        style={{ marginTop: Spacing.md }}
        testID={testIdWithKey('HoursOfServiceTitle')}
      >
        {t('BCSC.VideoCall.CallBusyOrClosed.HoursOfService')}
      </ThemedText>
      <ServicePeriodList items={formattedHours} />
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
          disabled={isWaitingForPermissions}
        >
          {isWaitingForPermissions && <ButtonLoading />}
        </Button>
        <Button
          buttonType={ButtonType.Secondary}
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
