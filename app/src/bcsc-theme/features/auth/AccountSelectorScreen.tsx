import { CardButton } from '@/bcsc-theme/components/CardButton'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { ScreenWrapper, ThemedText, useStore, useTheme } from '@bifold/core'
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
    container: {
      alignItems: 'center',
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsContainer: {
      width: '100%',
      gap: Spacing.md,
    },
  })

  const handleAccountSelect = useCallback(
    (nickname: string) => {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
      navigation.navigate(BCSCScreens.EnterPIN)
    },
    [dispatch, navigation]
  )

  return (
    <ScreenWrapper padded={false} scrollable={false} style={styles.container}>
      <View style={styles.contentContainer}>
        <GenericCardImage />
        <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
          {t('BCSC.AccountSetup.Title')}
        </ThemedText>
      </View>

      <View style={{ ...styles.controlsContainer, flexGrow: 1 }}>
        <ThemedText variant={'headingFour'}>{t('BCSC.AccountSetup.ContinueAs')}</ThemedText>

        <View style={{ gap: Spacing.sm }}>
          {Array.from(store.bcsc.nicknames).map((nickname) => (
            <CardButton key={nickname} title={nickname} onPress={() => handleAccountSelect(nickname)} />
          ))}
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default AccountSelectorScreen
