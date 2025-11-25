import useApi from '@/bcsc-theme/api/hooks/useApi'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { registration } = useApi()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
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
      safeAreaViewStyle={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
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
