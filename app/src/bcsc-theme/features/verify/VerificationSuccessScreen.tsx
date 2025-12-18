import useApi from '@/bcsc-theme/api/hooks/useApi'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, TOKENS, useServices, useStore } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet } from 'react-native'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { registration } = useApi()
  const { updateVerified, updateUserMetadata } = useSecureActions()

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

  const handleUpdateRegistration = useCallback(async () => {
    try {
      const registrationAccessToken = store.bcscSecure.registrationAccessToken
      const selectedNickname = store.bcsc.selectedNickname

      if (!registrationAccessToken) {
        logger.error('Failed to update registration: missing registrationAccessToken')
        return
      }

      if (!selectedNickname) {
        logger.error('Failed to update registration: missing selectedNickname')
        return
      }

      await registration.updateRegistration(registrationAccessToken, selectedNickname)
    } catch (error) {
      const strErr = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to update registration: ${strErr}`)
      return
    }
  }, [registration, store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, logger])

  const controls = (
    <Button
      testID={testIdWithKey(t('BCSC.Verification.ButtonText'))}
      accessibilityLabel={t('BCSC.Verification.ButtonText')}
      title={t('BCSC.Verification.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={async () => {
        await updateVerified(true)
        await updateUserMetadata(null)
        await handleUpdateRegistration()
      }}
    />
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
