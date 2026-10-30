import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCDispatchAction, BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import AddDeviceHands from '@assets/img/add-device-hands.svg'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountSetupScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AccountSetup>
}

const AccountSetupScreen = ({ navigation }: AccountSetupScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearDeviceCodes } = useSecureActions()
  const registrationService = useRegistrationService()
  const loadingScreen = useLoadingScreen()
  const storeRef = useRef(store)
  const registrationServiceRef = useRef(registrationService)
  const loadingScreenRef = useRef(loadingScreen)

  storeRef.current = store
  registrationServiceRef.current = registrationService
  loadingScreenRef.current = loadingScreen

  // Arriving (back) at the setup question abandons a previous device registration. Clearing locally isn't enough
  // IAS still considers the client registered from the abandoned transfer's device
  // authorization, so a later verification attempt (BCSC, Non BCSC) would run into an 'invald_registration_request' error.
  // Cycle the registration so that conflict never has a chance to occur.
  useFocusEffect(
    useCallback(() => {
      const { bcsc, bcscSecure } = storeRef.current
      if (bcsc.accountSetupType !== AccountSetupType.TransferAccount) {
        return
      }

      dispatch({ type: BCDispatchAction.ACCOUNT_SETUP_TYPE, payload: [] })

      if (bcscSecure.deviceCode && !bcscSecure.serial && !bcscSecure.additionalEvidenceData.length) {
        const stopLoading = loadingScreenRef.current.startLoading()
        const cleanUpAbandonedTransfer = async () => {
          try {
            await registrationServiceRef.current.cycleRegistration()
          } catch (error) {
            logger.error('[AccountSetupScreen] Failed to cycle registration after abandoned transfer', error as Error)
          }

          try {
            await clearDeviceCodes()
          } catch (error) {
            logger.error('[AccountSetupScreen] Failed to clear transfer device authorization', error as Error)
          }
        }
        cleanUpAbandonedTransfer().finally(stopLoading)
      }
    }, [dispatch, clearDeviceCodes, logger])
  )

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      gap: Spacing.lg,
    },
    image: {
      marginTop: Spacing.xxl,
      alignItems: 'center',
    },
  })

  // Registering the device is a network round trip, so it waits under the loading overlay. A device
  // that is already registered (back from the identity step, a restart, a resumed journey) has nothing
  // to wait for and keeps the overlay down: raised around the instant no-op, it flashed the loading
  // screen over the slide to the next step.
  const ensureRegistered = useCallback(async () => {
    if (registrationService.isRegistered) {
      return
    }

    const stopLoading = loadingScreen.startLoading()
    try {
      await registrationService.ensureRegistered()
    } finally {
      stopLoading()
    }
  }, [loadingScreen, registrationService])

  // "No, continue setup" — verify a new account on this device via the identity steps.
  const handleAddAccount = useCallback(async () => {
    try {
      await ensureRegistered()

      // Saved only once registered: a saved choice makes resume skip this screen
      dispatch({
        type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
        payload: [AccountSetupType.AddAccount],
      })
      navigation.navigate(BCSCScreens.IdentitySelection)
    } catch (error) {
      logger.error('[AccountSetupScreen] Failed to ensure registration for add account', error as Error)
    }
  }, [dispatch, ensureRegistered, logger, navigation])

  // "Yes, connect this device" — transfer an already-verified account by scanning the QR
  // shown on the other device, skipping the identity verification steps.
  const handleTransferAccount = useCallback(async () => {
    try {
      await ensureRegistered()

      // Saved only once registered: a saved choice makes resume skip this screen
      dispatch({
        type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
        payload: [AccountSetupType.TransferAccount],
      })
      navigation.navigate(BCSCScreens.TransferAccountInstructions)
    } catch (error) {
      logger.error('[AccountSetupScreen] Failed to ensure registration for transfer', error as Error)
    }
  }, [dispatch, ensureRegistered, logger, navigation])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey(TestIds.verify.accountSetup.addAccount)}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.AccountSetup.TransferAccount')}
        onPress={handleTransferAccount}
        accessibilityLabel={t('BCSC.AccountSetup.TransferAccount')}
        testID={testIdWithKey(TestIds.verify.accountSetup.transferAccount)}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <View style={styles.image}>
        <AddDeviceHands width={250} height={250} />
      </View>
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', color: ColorPalette.brand.primary }}>
        {t('BCSC.AccountSetup.Title')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center', fontSize: 20 }}>{t('BCSC.AccountSetup.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountSetupScreen
