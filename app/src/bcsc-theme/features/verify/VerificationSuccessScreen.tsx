import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, useAnimatedComponents } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet } from 'react-native'
import useVerificationResponseViewModel from './_models/useVerificationResponseViewModel'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const { isSettingUpAccount, handleAccountSetup } = useVerificationResponseViewModel()
  const { ButtonLoading } = useAnimatedComponents()

  const styles = StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  // Disable hardware back button on Android
  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return subscription.remove
  })

  const controls = (
    <Button
      testID={testIdWithKey(t('BCSC.Verification.ButtonText'))}
      accessibilityLabel={t('BCSC.Verification.ButtonText')}
      title={t('BCSC.Verification.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={async () => {
        await handleAccountSetup()
      }}
      disabled={isSettingUpAccount}
    >
      {isSettingUpAccount && <ButtonLoading />}
    </Button>
  )
  return (
    <ScreenWrapper
      padded
      controls={controls}
      edges={['top', 'bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.contentContainer}
    >
      <StatusDetails
        title={t('BCSC.Verification.Title')}
        description={t('BCSC.Verification.Description')}
        extraText={t('BCSC.Verification.ExtraText')}
      />
    </ScreenWrapper>
  )
}
export default VerificationSuccessScreen
