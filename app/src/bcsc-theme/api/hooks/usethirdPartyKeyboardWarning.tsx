import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCDispatchAction, BCState } from '@/store'
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
          emitAlert(t('BCSC.ThirdPartyKeyboard.Title'), t('BCSC.ThirdPartyKeyboard.Message'), {
            actions: [
              {
                text: t('BCSC.ThirdPartyKeyboard.ContinueButton'),
                style: 'cancel',
              },
              {
                text: t('BCSC.ThirdPartyKeyboard.ChangeButton'),
                style: 'destructive',
                onPress: () => openKeyboardSelector(),
              },
            ],
          })
          dispatch({ type: BCDispatchAction.DISMISSED_THIRD_PARTY_KEYBOARD_ALERT, payload: [true] })
        }
      }
    }
  }, [dispatch, emitAlert, hasShownWarning, t])

  return { showThirdPartyKeyboardWarning }
}

export default useThirdPartyKeyboardWarning
