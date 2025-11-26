import useApi from '@/bcsc-theme/api/hooks/useApi'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, TOKENS, useServices, useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { registration } = useApi()

  const styles = StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const handleUpdateRegistration = async () => {
    try {
      await registration.updateRegistration(store.bcsc.registrationAccessToken, store.bcsc.selectedNickname)
    } catch (error) {
      logger.error('Failed to update registration', { error })
      return
    }
  }

  const controls = (
    <Button
      testID={testIdWithKey(t('BCSC.Verification.ButtonText'))}
      accessibilityLabel={t('BCSC.Verification.ButtonText')}
      title={t('BCSC.Verification.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={() => {
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        dispatch({ type: BCDispatchAction.CLEAR_USER_METADATA })
        handleUpdateRegistration()
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
