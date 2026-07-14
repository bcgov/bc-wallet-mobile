import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { DeveloperModeTrigger } from '@/bcsc-theme/components/DeveloperModeTrigger'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCDispatchAction, BCState } from '@/store'
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
import { CommonActions, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { getAccountSecurityMethod } from 'react-native-bcsc-core'

interface AccountSetupScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AccountSetup>
}

const AccountSetupScreen = ({ navigation }: AccountSetupScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registrationService = useRegistrationService()
  const { clearDeviceCodes } = useSecureActions()

  // Latest store snapshot for the focus effect below. Reading through a ref keeps the effect
  // callback stable so it only runs on focus transitions — depending on the store directly
  // would re-run it the moment a choice is dispatched and immediately clear it.
  const storeRef = useRef(store)
  storeRef.current = store

  // Arriving (back) at the setup question abandons a previously chosen transfer. Clear the
  // persisted choice — it forces the resume route into the transfer screens, which is what
  // locked users out of returning to a traditional setup. Any device authorization issued for
  // the transfer has no identity attached, so discard it too (unless the ID step has progress,
  // in which case the authorization belongs to that flow).
  useFocusEffect(
    useCallback(() => {
      const { bcsc, bcscSecure } = storeRef.current
      if (bcsc.accountSetupType !== AccountSetupType.TransferAccount) {
        return
      }

      dispatch({ type: BCDispatchAction.ACCOUNT_SETUP_TYPE, payload: [] })

      if (bcscSecure.deviceCode && !bcscSecure.serial && !bcscSecure.additionalEvidenceData.length) {
        clearDeviceCodes().catch((error) =>
          logger.error('[AccountSetupScreen] Failed to clear transfer device authorization', error as Error)
        )
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
    pressableArea: {
      width: '100%',
    },
  })

  const registerAccountWithBackend = useCallback(async () => {
    // 1. Check if account is already registered
    if (store.bcscSecure.registrationAccessToken) {
      logger.info('[AccountSetupScreen] Account already registered with backend, skipping registration')
      return
    }

    // 2. Register the account with the backend
    try {
      const securityMethod = await getAccountSecurityMethod()

      // Note: Fetches registration access token and updates the account's `clientID`
      await registrationService.register(securityMethod)
    } catch (error) {
      logger.error('[AccountSetupScreen] Error creating registration with backend', error as Error)
      // 3. Reset the navigation stack to the account setup screen to allow the user to retry
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.AccountSetup }],
        })
      )
    }
  }, [logger, navigation, registrationService, store.bcscSecure.registrationAccessToken])

  // "No, continue setup" — verify a new account on this device via the identity steps.
  const handleAddAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.AddAccount],
    })

    // Not awaiting to prevent blocking navigation
    void registerAccountWithBackend()
    navigation.navigate(BCSCScreens.IdentitySelection)
  }, [navigation, dispatch, registerAccountWithBackend])

  // "Yes, connect this device" — transfer an already-verified account by scanning the QR
  // shown on the other device, skipping the identity verification steps.
  const handleTransferAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.TransferAccount],
    })

    // Not awaiting to prevent blocking navigation
    void registerAccountWithBackend()
    navigation.navigate(BCSCScreens.TransferAccountInstructions)
  }, [dispatch, registerAccountWithBackend, navigation])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey('AddAccount')}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.AccountSetup.TransferAccount')}
        onPress={handleTransferAccount}
        accessibilityLabel={t('BCSC.AccountSetup.TransferAccount')}
        testID={testIdWithKey('TransferAccount')}
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
      <DeveloperModeTrigger
        onActivate={() => navigation.navigate(BCSCScreens.VerifyDeveloper)}
        style={styles.pressableArea}
      >
        <View style={styles.image}>
          <AddDeviceHands width={250} height={250} />
        </View>
      </DeveloperModeTrigger>
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', color: ColorPalette.brand.primary }}>
        {t('BCSC.AccountSetup.Title')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center', fontSize: 20 }}>{t('BCSC.AccountSetup.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountSetupScreen
