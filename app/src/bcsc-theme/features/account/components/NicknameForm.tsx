import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { hasNickname } from '@/bcsc-theme/utils/account-utils'
import { formStringLengths } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  KeyboardView,
  LimitedTextInput,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { TOKENS, useServices } from '@bifold/core'

interface NicknameFormProps {
  isRenaming?: boolean
}

const NicknameForm: React.FC<NicknameFormProps> = ({ isRenaming }) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const [accountNickname, setAccountNickname] = useState(store.bcsc.selectedNickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {},
    bulletPointContainer: {
      marginBottom: Spacing.md,
      marginLeft: Spacing.sm,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setAccountNickname(text)
  }, [])

  const handleContinuePressed = useCallback(async () => {
    //trim the account nickname
    const trimmedAccountNickname = accountNickname.trim()

    if (trimmedAccountNickname.length < formStringLengths.minimumLength) {
      setError(t('Unified.NicknameAccount.EmptyNameTitle'))
      return
    }

    if (trimmedAccountNickname.length > formStringLengths.maximumLength) {
      setError(t('Unified.NicknameAccount.CharCountTitle'))
      return
    }

    if (hasNickname(store, trimmedAccountNickname)) {
      setError(t('Unified.NicknameAccount.NameAlreadyExists'))
      return
    }

    setError(null)
    setLoading(true)

    if (isRenaming) {
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
      } catch (error) {
        logger.error('Failed to update registration', { error })
        return
      }
      Toast.show({
        type: 'success',
        text1: t('Global.Success'),
        text2: t('Unified.NicknameAccount.RenameSuccessToastMessage'),
        position: 'bottom',
      })
      navigation.goBack()
    } else {
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedAccountNickname] })

      // Select the newly added nickname
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedAccountNickname] })

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    }
  }, [accountNickname, t, isRenaming, dispatch, navigation, store, registration, logger])

  return (
    <KeyboardView keyboardAvoiding={false}>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.NicknameAccount.AccountName')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.md }}>
            {isRenaming ? t('Unified.NicknameAccount.EditAccountName') : t('Unified.NicknameAccount.CreateAccountName')}
          </ThemedText>

          <View style={styles.bulletPointContainer}>
            <BulletPoint pointsText={t('Unified.NicknameAccount.AccountNameDescription1')} />
            <BulletPoint pointsText={t('Unified.NicknameAccount.AccountNameDescription2')} />
          </View>

          <LimitedTextInput
            showLimitCounter={false}
            defaultValue={accountNickname}
            label={t('Unified.NicknameAccount.AccountName')}
            limit={formStringLengths.maximumLength}
            handleChangeText={handleChangeText}
            accessibilityLabel={t('Unified.NicknameAccount.AccountName')}
            testID={testIdWithKey('NameInput')}
          />
          {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
        </View>
        <View style={styles.controlsContainer}>
          <Button
            title={isRenaming ? t('Global.Save') : t('Unified.NicknameAccount.SaveAndContinue')}
            buttonType={ButtonType.Primary}
            testID={isRenaming ? testIdWithKey('Save') : testIdWithKey('SaveAndContinue')}
            accessibilityLabel={isRenaming ? t('Global.Save') : t('Unified.NicknameAccount.SaveAndContinue')}
            onPress={handleContinuePressed}
            disabled={loading}
          >
            {loading && <ButtonLoading />}
          </Button>
        </View>
      </View>
    </KeyboardView>
  )
}

export default NicknameForm
