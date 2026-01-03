import React, { useCallback } from 'react'

import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import NicknameForm from './components/NicknameForm'

// TODO: (Al) Add custom props, so this has a screen to navigate to rather than hard coded
const NicknameAccountScreen: React.FC = () => {
  const navigation = useNavigation()
  const [, dispatch] = useStore<BCState>()

  const handleSubmit = useCallback(
    (trimmedNickname: string) => {
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedNickname] })
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedNickname] })
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    },
    [dispatch, navigation]
  )

  return <NicknameForm onSubmit={handleSubmit} />
}

export default NicknameAccountScreen
