import { CardButton } from '@/bcsc-theme/components/CardButton'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const AccountSetupSelectionScreen: React.FC = () => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
    },
    [dispatch]
  )

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.contentContainer}>
        <GenericCardImage />
        <ThemedText variant={'headingFour'}>{t('Unified.AccountSetup.Title')}</ThemedText>
      </View>

      {store.bcsc.nicknames.length > 0 ? (
        <View style={{ ...styles.controlsContainer, flexGrow: 1 }}>
          <ThemedText variant={'headingFour'}>{t('Unified.AccountSelector.ContinueAs')}</ThemedText>

          <View style={{ gap: Spacing.sm }}>
            {Array.from(store.bcsc.nicknames).map((nickname) => (
              <CardButton key={nickname} title={nickname} onPress={() => handleAccountSelect(nickname)} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            title={t('Unified.AccountSetup.AddAccount')}
            onPress={() => {
              if (store.bcsc.completedNewSetup) {
                navigation.navigate(BCSCScreens.SetupSteps)
              } else {
                navigation.navigate(BCSCScreens.NewSetup)
              }
            }}
          />
          <Button
            buttonType={ButtonType.Secondary}
            title={t('Unified.AccountSetup.TransferAccount')}
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountInformation)
            }}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

export default AccountSetupSelectionScreen
