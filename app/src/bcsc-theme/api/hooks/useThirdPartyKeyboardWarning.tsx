import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openAndroidKeyboardSelector } from 'react-native-bcsc-core'

/**
 * The function respoinsible for showing the third party keyboard warning alert. Moved out of hook for testability.
 *
 * @param hasShownWarning boolean to determine if this alert has been seen already
 * @param t Translation text
 * @param emitAlert Function that displays alert to user
 * @param dispatch Dispatch funtion to update when the user has seen the alert so it doesn't show again
 * @returns
 */
export const showThirdPartyKeyboardWarning = async (
  hasShownWarning: boolean,
  t: (key: string) => string,
  emitAlert: (title: string, description: string, options: any) => void,
  dispatch: (action: any) => void
) => {
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
}

/**
 * Custom hook to show a warning when a third-party keyboard is detected on an android device.
 * This warning is only shown to the user once
 */
const useThirdPartyKeyboardWarning = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()

  const hasShownWarning = Boolean(store.bcsc.hasDismissedThirdPartyKeyboardAlert)

  useEffect(() => {
    const didShowListener = Keyboard.addListener('keyboardDidShow', () =>
      showThirdPartyKeyboardWarning(hasShownWarning, t, emitAlert, dispatch)
    )
    return () => {
      didShowListener.remove()
    }
  }, [hasShownWarning, t, emitAlert, dispatch])
}

export default useThirdPartyKeyboardWarning
