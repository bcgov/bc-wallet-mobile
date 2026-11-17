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
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountSetupScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AccountSetup>
}

const AccountSetupScreen = ({ navigation }: AccountSetupScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearDeviceCodes } = useSecureActions()
  const registrationService = useRegistrationService()
  const loadingScreen = useLoadingScreen()
  /** The setup choice whose device registration is in flight, if any. */
  const [registeringFor, setRegisteringFor] = useState<AccountSetupType | null>(null)
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
        void cleanUpAbandonedTransfer().finally(stopLoading)
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

  // Registering the device is a network round trip. It waits on the pressed button, inside the card,
  // rather than under the global overlay: the overlay hides this screen, and released as the push to
  // the next step started it left the slide beginning from a screen that had just been hidden. A device
  // that is already registered (back from the identity step, a restart, a resumed journey) has nothing
  // to wait for and moves on at once.
  const chooseSetupType = useCallback(
    async (setupType: AccountSetupType, goToNextStep: () => void) => {
      if (!registrationService.isRegistered) {
        setRegisteringFor(setupType)
        try {
          await registrationService.ensureRegistered()
        } catch (error) {
          logger.error(`[AccountSetupScreen] Failed to register the device for ${setupType}`, error as Error)
          return
        } finally {
          setRegisteringFor(null)
        }

        // Back stays live during an in-card wait: a user who left has abandoned the choice
        if (!navigation.isFocused()) {
          return
        }
      }

      // Saved only once registered: a saved choice makes resume skip this screen
      dispatch({ type: BCDispatchAction.ACCOUNT_SETUP_TYPE, payload: [setupType] })
      goToNextStep()
    },
    [dispatch, logger, navigation, registrationService]
  )

  // "No, continue setup" — verify a new account on this device via the identity steps.
  const handleAddAccount = useCallback(
    () => chooseSetupType(AccountSetupType.AddAccount, () => navigation.navigate(BCSCScreens.IdentitySelection)),
    [chooseSetupType, navigation]
  )

  // "Yes, connect this device" — transfer an already-verified account by scanning the QR
  // shown on the other device, skipping the identity verification steps.
  const handleTransferAccount = useCallback(
    () =>
      chooseSetupType(AccountSetupType.TransferAccount, () =>
        navigation.navigate(BCSCScreens.TransferAccountInstructions)
      ),
    [chooseSetupType, navigation]
  )

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey(TestIds.verify.accountSetup.addAccount)}
        disabled={registeringFor !== null}
      >
        {registeringFor === AccountSetupType.AddAccount && <ButtonLoading />}
      </Button>
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.AccountSetup.TransferAccount')}
        onPress={handleTransferAccount}
        accessibilityLabel={t('BCSC.AccountSetup.TransferAccount')}
        testID={testIdWithKey(TestIds.verify.accountSetup.transferAccount)}
        disabled={registeringFor !== null}
      >
        {registeringFor === AccountSetupType.TransferAccount && <ButtonLoading />}
      </Button>
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
