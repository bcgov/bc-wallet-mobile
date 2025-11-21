import React, { useCallback, useState } from 'react'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  testIdWithKey,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import Toast from 'react-native-toast-message'
import { getNicknameValidationErrorKey } from '../../utils/account-utils'
import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { ButtonLoading } = useAnimatedComponents()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [accountNickname, setAccountNickname] = useState(store.bcsc.selectedNickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
    },
    controlsContainer: {
      paddingVertical: Spacing.md,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setAccountNickname(text)
  }, [])

  const handleButtonPress = useCallback(async () => {
    const trimmedAccountNickname = accountNickname.trim()
    const validationErrorKey = getNicknameValidationErrorKey(store, trimmedAccountNickname)

    if (validationErrorKey) {
      setError(t(validationErrorKey))
      return
    }

    setError(null)
    setLoading(true)

    dispatch({
      type: BCDispatchAction.UPDATE_NICKNAME,
      payload: [{ nickname: store.bcsc.selectedNickname, newNickname: trimmedAccountNickname }],
    })
    dispatch({
      type: BCDispatchAction.SELECT_ACCOUNT,
      payload: [trimmedAccountNickname],
    })

    try {
      await registration.updateRegistration(store.bcsc.registrationAccessToken, trimmedAccountNickname)
    } catch (apiError) {
      logger.error('Failed to update registration', { error: apiError })
      setLoading(false)
      return
    }

    Toast.show({
      type: 'success',
      text1: t('Global.Success'),
      text2: t('BCSC.NicknameAccount.RenameSuccessToastMessage'),
      position: 'bottom',
    })

    setLoading(false)
    navigation.goBack()
  }, [accountNickname, dispatch, logger, navigation, registration, store, t])

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
      edges={['bottom', 'left', 'right']}
      controls={controls}
      containerStyle={styles.pageContainer}
      controlsContainerStyle={styles.controlsContainer}
    >
      <NicknameForm accountNickname={accountNickname} onChangeText={handleChangeText} error={error} isRenaming />
    </ScreenWrapper>
  )
}

export default EditNicknameScreen
