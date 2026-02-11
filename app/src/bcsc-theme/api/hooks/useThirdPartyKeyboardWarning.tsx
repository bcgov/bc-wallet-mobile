import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { isThirdPartyKeyboardActive, openAndroidKeyboardSelector } from 'react-native-bcsc-core'

const useThirdPartyKeyboardWarning = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()

  const hasShownWarning = Boolean(store.bcsc.hasDismissedThirdPartyKeyboardAlert)

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

  return { showThirdPartyKeyboardWarning }
}

export default useThirdPartyKeyboardWarning
