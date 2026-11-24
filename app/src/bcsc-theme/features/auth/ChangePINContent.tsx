import { ChangePINForm } from '@/bcsc-theme/features/auth/components/ChangePINForm'
import { PINEntryForm, PINEntryResult } from '@/bcsc-theme/features/auth/components/PINEntryForm'
import { useWalletService } from '@/bcsc-theme/services/hooks/useWalletService'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setAccountSecurityMethod } from 'react-native-bcsc-core'

export interface ChangePINContentProps {
  isChangingExistingPIN: boolean
  onChangePINSuccess: () => void
  onCreatePINSuccess: () => void
}

/**
 * Shared ChangePIN content component that can be used across different navigation stacks.
 * Handles two use cases:
 * 1. Switching from Device Auth to PIN (isChangingExistingPIN = false)
 *    - Uses PINEntryForm (new PIN + confirm)
 * 2. Changing an existing PIN (isChangingExistingPIN = true)
 *    - Uses ChangePINForm (current PIN + new PIN + confirm)
 *
 * Either form waits on its button rather than under the global loading overlay, because the success
 * callbacks navigate within the stack and the slide away must start from this screen. That leaves Back
 * live during the wallet key rotation, so a user who already left is not navigated a second time.
 */
export const ChangePINContent = ({
  isChangingExistingPIN,
  onChangePINSuccess,
  onCreatePINSuccess,
}: ChangePINContentProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const walletService = useWalletService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [, dispatch] = useStore<BCState>()

  const handleChangePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      logger.info('PIN changed successfully')

      await walletService.rotateWalletKey(result.walletKey)

      if (navigation.isFocused()) {
        onChangePINSuccess()
      }
    },
    [logger, navigation, walletService, onChangePINSuccess]
  )

  const handleCreatePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
      const method = isDeviceAuthAvailable
        ? AccountSecurityMethod.PinWithDeviceAuth
        : AccountSecurityMethod.PinNoDeviceAuth
      await setAccountSecurityMethod(method)
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_SECURITY_METHOD, payload: [method] })

      logger.info('Switched to PIN security method')

      await walletService.rotateWalletKey(result.walletKey)

      if (navigation.isFocused()) {
        onCreatePINSuccess()
      }
    },
    [logger, navigation, walletService, onCreatePINSuccess, dispatch]
  )

  if (isChangingExistingPIN) {
    return <ChangePINForm onSuccess={handleChangePINSuccess} />
  }

  return <PINEntryForm onSuccess={handleCreatePINSuccess} translationPrefix="BCSC.PIN" />
}
