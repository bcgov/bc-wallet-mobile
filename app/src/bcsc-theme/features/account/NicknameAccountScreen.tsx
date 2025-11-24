import React, { useCallback, useState } from 'react'

import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { getNicknameValidationErrorKey } from '../../utils/account-utils'
import NicknameForm from './components/NicknameForm'

const NicknameAccountScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { ButtonLoading } = useAnimatedComponents()
  const [store, dispatch] = useStore<BCState>()
  const [accountNickname, setAccountNickname] = useState(store.bcsc.selectedNickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      paddingHorizontal: Spacing.md,
    },
    controlsContainer: {
      paddingVertical: Spacing.md,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setAccountNickname(text)
  }, [])

  const handleButtonPress = useCallback(() => {
    const trimmedAccountNickname = accountNickname.trim()
    const validationErrorKey = getNicknameValidationErrorKey(store, trimmedAccountNickname)

    if (validationErrorKey) {
      setError(t(validationErrorKey))
      return
    }

    setError(null)
    setLoading(true)

    dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedAccountNickname] })
    dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedAccountNickname] })
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
  }, [accountNickname, dispatch, navigation, store, t])

  const controls = (
    <Button
      title={t('BCSC.NicknameAccount.SaveAndContinue')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('SaveAndContinue')}
      accessibilityLabel={t('BCSC.NicknameAccount.SaveAndContinue')}
      onPress={handleButtonPress}
      disabled={loading}
    >
      {loading && <ButtonLoading />}
    </Button>
  )

  return (
    <ScreenWrapper
      keyboardActive
      controls={controls}
      containerStyle={styles.pageContainer}
      controlsContainerStyle={styles.controlsContainer}
    >
      <NicknameForm accountNickname={accountNickname} onChangeText={handleChangeText} error={error} />
    </ScreenWrapper>
  )
}

export default NicknameAccountScreen
