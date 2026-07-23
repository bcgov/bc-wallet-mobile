import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { DeveloperModeTrigger } from '@/bcsc-theme/components/DeveloperModeTrigger'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
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
  const [isAddingAccount, setIsAddingAccount] = useState(false)

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

    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.AddAccount],
    })

    navigation.navigate(BCSCScreens.IdentitySelection)
  }, [dispatch, navigation])

  // "Yes, connect this device" — transfer an already-verified account by scanning the QR
  // shown on the other device, skipping the identity verification steps.
  const handleTransferAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.TransferAccount],
    })

    navigation.navigate(BCSCScreens.TransferAccountInstructions)
  }, [dispatch, navigation])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey('AddAccount')}
        disabled={isAddingAccount}
      >
        {isAddingAccount && <ButtonLoading />}
      </Button>
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
