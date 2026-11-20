import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { selectJourney } from '@/bcsc-theme/state/verification/journey'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { AccountSetupType } from '@/store'
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
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearDeviceCodes } = useSecureActions()
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const registrationService = useRegistrationService()
  const loadingScreen = useLoadingScreen()
  const registrationServiceRef = useRef(registrationService)
  const loadingScreenRef = useRef(loadingScreen)

  registrationServiceRef.current = registrationService
  loadingScreenRef.current = loadingScreen

  // Arriving (back) at the setup question abandons a previous device registration. Clearing locally isn't enough
  // IAS still considers the client registered from the abandoned transfer's device
  // authorization, so a later verification attempt (BCSC, Non BCSC) would run into an 'invald_registration_request' error.
  // Cycle the registration so that conflict never has a chance to occur.
  useFocusEffect(
    useCallback(() => {
      const state = getBCSCState()
      if (state.app.accountSetupType !== AccountSetupType.TransferAccount) {
        return
      }

      void getBCSCState().app.update({ accountSetupType: undefined })

      const { deviceCode, serial, additionalEvidenceData } = selectJourney(state)
      if (deviceCode && !serial && !additionalEvidenceData.length) {
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
    }, [clearDeviceCodes, logger])
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

  useFocusEffect(
    useCallback(() => {
      // set loading state to false on unmount
      // so the user isn't stuck if they come back to this screen
      return () => {
        setIsAddingAccount(false)
      }
    }, [])
  )

  // "No, continue setup" — verify a new account on this device via the identity steps.
  const handleAddAccount = useCallback(async () => {
    setIsAddingAccount(true)

    const stopLoading = loadingScreen.startLoading()

    try {
      await registrationService.ensureRegistered()

      // Saved only once registered: a saved choice makes resume skip this screen
      await getBCSCState().app.update({ accountSetupType: AccountSetupType.AddAccount })
      navigation.navigate(BCSCScreens.IdentitySelection)
    } catch (error) {
      setIsAddingAccount(false)
      logger.error('[AccountSetupScreen] Failed to ensure registration for add account', error as Error)
    } finally {
      stopLoading()
    }
  }, [loadingScreen, logger, navigation, registrationService])

  // "Yes, connect this device" — transfer an already-verified account by scanning the QR
  // shown on the other device, skipping the identity verification steps.
  const handleTransferAccount = useCallback(async () => {
    const stopLoading = loadingScreen.startLoading()

    try {
      await registrationService.ensureRegistered()

      // Saved only once registered: a saved choice makes resume skip this screen
      await getBCSCState().app.update({ accountSetupType: AccountSetupType.TransferAccount })
      navigation.navigate(BCSCScreens.TransferAccountInstructions)
    } catch (error) {
      logger.error('[AccountSetupScreen] Failed to ensure registration for transfer', error as Error)
    } finally {
      stopLoading()
    }
  }, [loadingScreen, logger, navigation, registrationService])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey(TestIds.verify.accountSetup.addAccount)}
        disabled={isAddingAccount}
      >
        {isAddingAccount && <ButtonLoading />}
      </Button>
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
