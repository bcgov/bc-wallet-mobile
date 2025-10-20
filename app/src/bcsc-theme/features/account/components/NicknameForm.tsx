import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import {
  useStore,
  useTheme,
  testIdWithKey,
  useAnimatedComponents,
  Button,
  ButtonType,
  LimitedTextInput,
  ThemedText,
  KeyboardView,
  BulletPoint,
} from '@bifold/core'
import { BCDispatchAction, BCState } from '@/store'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { formStringLengths } from '@/constants'
import { hasNickname } from '@/bcsc-theme/utils/account-utils'

interface NicknameFormProps {
  isRenaming?: boolean
  onSubmitSuccess?: (name: string) => void
  onCancel?: () => void
}

const NicknameForm: React.FC<NicknameFormProps> = ({ isRenaming, onSubmitSuccess, onCancel }) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const [accountNickname, setAccountNickname] = useState(store.bcsc.selectedNickname ?? '')
  const [error, setError] = useState<string | null>(null)

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
    controlsContainer: {
      marginTop: 'auto',
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const handleChangeText = useCallback((text: string) => {
    setAccountNickname(text)
  }, [])

  const handleContinuePressed = useCallback(() => {
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

    if (isRenaming) {
      onSubmitSuccess?.(trimmedAccountNickname)
    } else {
      setError(null)
      setLoading(true)

      if (hasNickname(store, trimmedAccountNickname)) {
        setError(t('Unified.NicknameAccount.NameAlreadyExists'))
        return
      }

      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedAccountNickname] })

      // Select the newly added nickname
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedAccountNickname] })

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    }
  }, [accountNickname, t, isRenaming, onSubmitSuccess, dispatch, navigation, store])

  return (
    <KeyboardView>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.NicknameAccount.AccountName')}
          </ThemedText>

          <ThemedText style={{ marginBottom: Spacing.md }}>{t('Unified.NicknameAccount.CreateAccountName')}</ThemedText>

          <ThemedText style={{ marginLeft: Spacing.md }}>
            <BulletPoint
              textStyle={{ marginLeft: Spacing.md }}
              text={t('Unified.NicknameAccount.AccountNameDescription1')}
            />
            <BulletPoint
              textStyle={{ marginLeft: Spacing.md }}
              text={t('Unified.NicknameAccount.AccountNameDescription2')}
            />
          </ThemedText>

          <LimitedTextInput
            showLimitCounter={false}
            defaultValue={accountNickname}
            label={t('Unified.NicknameAccount.AccountName')}
            limit={50}
            handleChangeText={handleChangeText}
            accessibilityLabel={t('Unified.NicknameAccount.AccountName')}
            testID={testIdWithKey('NameInput')}
          />
          {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
        </View>
        <View style={styles.controlsContainer}>
          <Button
            title={isRenaming ? t('Global.Save') : t('Global.Continue')}
            buttonType={ButtonType.Primary}
            testID={isRenaming ? testIdWithKey('Save') : testIdWithKey('Continue')}
            accessibilityLabel={isRenaming ? t('Global.Save') : t('Global.Continue')}
            onPress={handleContinuePressed}
            disabled={loading}
          >
            {loading && <ButtonLoading />}
          </Button>
          {isRenaming && (
            <View style={styles.secondButton}>
              <Button
                title={t('Global.Cancel')}
                buttonType={ButtonType.Secondary}
                testID={testIdWithKey('Cancel')}
                accessibilityLabel={t('Global.Cancel')}
                onPress={onCancel}
              />
            </View>
          )}
        </View>
      </View>
    </KeyboardView>
  )
}

export default NicknameForm
