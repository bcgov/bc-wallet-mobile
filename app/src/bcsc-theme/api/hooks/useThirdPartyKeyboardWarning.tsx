import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openAndroidKeyboardSelector } from 'react-native-bcsc-core'

/**
 * Custom hook to show a warning when a third-party keyboard is detected on an android device.
 * This warning is only shown once
 */
const useThirdPartyKeyboardWarning = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()

  const hasShownWarning = Boolean(store.bcsc.hasDismissedThirdPartyKeyboardAlert)

  useEffect(() => {
    const didShowListener = Keyboard.addListener('keyboardDidShow', showThirdPartyKeyboardWarning)
    return () => {
      didShowListener.remove()
    }
  }, [])

  const showThirdPartyKeyboardWarning = useCallback(async () => {
    // The user should only see this warning once
    if (hasShownWarning) {
      return
    }

    if (Platform.OS === 'android') {
      const isthirdPartyKeyboard = await isThirdPartyKeyboardActive()
      if (isthirdPartyKeyboard) {
        emitAlert(t('Alerts.ThirdPartyKeyboard.Title'), t('Alerts.ThirdPartyKeyboard.Description'), {
          actions: [
            {
              text: t('Alerts.ThirdPartyKeyboard.Action1'),
              style: 'cancel',
            },
            {
              text: t('Alerts.ThirdPartyKeyboard.Action2'),
              style: 'destructive',
              onPress: () => openAndroidKeyboardSelector(),
            },
          ],
        })
        dispatch({ type: BCDispatchAction.DISMISSED_THIRD_PARTY_KEYBOARD_ALERT, payload: [true] })
      }
    }
  }, [dispatch, emitAlert, hasShownWarning, t])
}

export default useThirdPartyKeyboardWarning
