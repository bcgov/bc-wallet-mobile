import React, { useCallback } from 'react'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCDispatchAction, BCState } from '@/store'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { BcscNativeErrorCodes, isBcscNativeError } from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'
import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitError } = useErrorAlert()

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      dispatch({
        type: BCDispatchAction.UPDATE_NICKNAME,
        payload: [{ nickname: store.bcsc.selectedNickname, newNickname: trimmedNickname }],
      })
      dispatch({
        type: BCDispatchAction.SELECT_ACCOUNT,
        payload: [trimmedNickname],
      })

      try {
        await registration.updateRegistration(store.bcscSecure.registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        if (isBcscNativeError(apiError) && apiError.code === BcscNativeErrorCodes.KEYPAIR_GENERATION_FAILED) {
          emitError('KEYPAIR_GENERATION_ERROR', { error: apiError })
        }
        logger.error('Failed to update registration', { error: apiError })
        throw apiError
      }

      Toast.show({
        type: 'success',
        text1: t('Global.Success'),
        text2: t('BCSC.NicknameAccount.RenameSuccessToastMessage'),
        position: 'bottom',
      })

      navigation.goBack()
    },
    [
      dispatch,
      logger,
      navigation,
      registration,
      store.bcscSecure.registrationAccessToken,
      store.bcsc.selectedNickname,
      t,
      emitError,
    ]
  )

  return <NicknameForm onSubmit={handleSubmit} isRenaming />
}

export default EditNicknameScreen
