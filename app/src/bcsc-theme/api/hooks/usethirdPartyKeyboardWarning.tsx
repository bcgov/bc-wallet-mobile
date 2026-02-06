import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openKeyboardSelector } from 'react-native-bcsc-core'

const useThirdPartyKeyboardWarning = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()

  const hasShownWarning = Boolean(store.bcsc.hasDismissedThirdPartyKeyboardAlert)

  const showThirdPartyKeyboardWarning = useCallback(async () => {
    {
      // The user should only see this warning once
      if (hasShownWarning) {
        return
      }

      if (Platform.OS === 'android') {
        const isthirdPartyKeyboard = await isThirdPartyKeyboardActive()
        if (isthirdPartyKeyboard) {
          emitAlert(
            'Warning',
            'This device is using a non-standard keyboard. It may be able to collect everything you type. Do you want to continue using the third party keyboard?',
            {
              actions: [
                {
                  text: 'Continue',
                  style: 'cancel',
                },
                { text: 'Change Keyboard', style: 'destructive', onPress: () => openKeyboardSelector() },
              ],
            }
          )
          //   dispatch({ type: BCDispatchAction.DISMISSED_THIRD_PARTY_KEYBOARD_ALERT, payload: [true] })
        }
      }
    }
  }, [dispatch, emitAlert, hasShownWarning, t])

  return { showThirdPartyKeyboardWarning }
}

export default useThirdPartyKeyboardWarning
