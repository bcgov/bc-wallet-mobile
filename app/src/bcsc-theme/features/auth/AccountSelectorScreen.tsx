import { CardButton } from '@/bcsc-theme/components/CardButton'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountSelectorScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AccountSelector>
}

const AccountSelectorScreen = ({ navigation }: AccountSelectorScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })

  const handleAccountSelect = useCallback(
    (nickname: string) => {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
      navigation.navigate(BCSCScreens.EnterPIN)
    },
    [dispatch, navigation],
  )

  // This handles the case where user has completed onboarding but has not set a nickname yet
  const controls = store.bcsc.nicknames.length ? (
    <>
      <ThemedText variant={'headingFour'}>{t('BCSC.AccountSetup.ContinueAs')}</ThemedText>
      <View style={{ gap: Spacing.sm }}>
        {Array.from(store.bcsc.nicknames).map((nickname) => (
          <CardButton key={nickname} title={nickname} onPress={() => handleAccountSelect(nickname)} />
        ))}
      </View>
    </>
  ) : (
    <Button
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('ContinueSetup')}
      title={'Continue setting up account'}
      accessibilityLabel={'Continue setting up account'}
      onPress={() => navigation.navigate(BCSCScreens.EnterPIN)}
    />
  )

  return (
    <ScreenWrapper padded scrollable scrollViewContainerStyle={styles.contentContainer} controls={controls}>
      <GenericCardImage />
      <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
        {t('BCSC.AccountSetup.Title')}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default AccountSelectorScreen
