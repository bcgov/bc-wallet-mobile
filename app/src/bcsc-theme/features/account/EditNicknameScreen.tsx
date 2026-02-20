import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useAlerts } from '@/hooks/useAlerts'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BcscNativeErrorCodes, isBcscNativeError } from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'
import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { problemWithAppAlert } = useAlerts(navigation)

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
          problemWithAppAlert()
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
      store.bcsc.selectedNickname,
      store.bcscSecure.registrationAccessToken,
      t,
      navigation,
      registration,
      logger,
      problemWithAppAlert,
    ]
  )

  return <NicknameForm onSubmit={handleSubmit} isRenaming />
}

export default EditNicknameScreen
