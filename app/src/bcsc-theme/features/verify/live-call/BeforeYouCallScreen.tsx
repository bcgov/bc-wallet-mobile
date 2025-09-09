import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type BeforeYouCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.BeforeYouCall>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.BeforeYouCall>
}

const BeforeYouCallScreen = ({ navigation, route }: BeforeYouCallScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { type: networkType, isConnected } = useNetInfo()
  const { t } = useTranslation()
  const { formattedHours } = route.params || {}

  // Use the passed formatted hours or fallback to default
  const hoursText = formattedHours || 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  const isCellular = useMemo(() => networkType === 'cellular' && isConnected === true, [networkType, isConnected])

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
  })

  const onPressContinue = async () => {
    navigation.navigate(BCSCScreens.TakePhoto, {
      forLiveCall: true,
      deviceSide: 'front',
      cameraInstructions: '',
      cameraLabel: '',
    })
  }

  const onPressAssistance = () => {
    // TODO (bm): webview or external link here presumeably
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.VideoCall.BeforeYouCallTitle')}
        </ThemedText>
        <ThemedText variant={'headingFour'}>{t('Unified.VideoCall.WiFiRecommended')}</ThemedText>
        <ThemedText>
          {isCellular ? t('Unified.VideoCall.CellularNetworkWarning') : ''}
          {t('Unified.VideoCall.StandardDataCharges')}
        </ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          {t('Unified.VideoCall.FindPrivatePlace')}
        </ThemedText>
        <ThemedText>{t('Unified.VideoCall.MakeSureOnlyYou')}</ThemedText>

        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          {t('Unified.VideoCall.HoursOfService')}
        </ThemedText>
        <ThemedText>{hoursText}</ThemedText>
        <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.md }}>
          {t('Unified.VideoCall.ContactCentrePrivacy')}
        </ThemedText>
        <ThemedText>{t(`Unified.VideoCall.PrivacyNotice`)}</ThemedText>
        <ThemedText style={{ marginTop: Spacing.md }}>{t(`Unified.VideoCall.PrivacyContactInfo`)}</ThemedText>

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
            accessibilityLabel={t('Unified.VideoCall.Assistance')}
            title={t('Unified.VideoCall.Assistance')}
            onPress={onPressAssistance}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
export default BeforeYouCallScreen
