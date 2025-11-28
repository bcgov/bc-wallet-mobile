import { CardButton } from '@/bcsc-theme/components/CardButton'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const AccountSetupSelectionScreen: React.FC = () => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
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
      if (store.bcsc.completedNewSetup) {
        navigation.navigate(BCSCScreens.SetupSteps)
      }
    },
    [dispatch, navigation, store.bcsc.completedNewSetup]
  )

  return (
    <ScreenWrapper padded={false} scrollable={false} style={styles.container}>
      <View style={styles.contentContainer}>
        <GenericCardImage />
        <ThemedText variant={'headingFour'}>{t('BCSC.AccountSetup.Title')}</ThemedText>
      </View>

      {store.bcsc.nicknames.length > 0 ? (
        <View style={{ ...styles.controlsContainer, flexGrow: 1 }}>
          <ThemedText variant={'headingFour'}>{t('BCSC.AccountSetup.ContinueAs')}</ThemedText>

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
            title={t('BCSC.AccountSetup.AddAccount')}
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
            title={t('BCSC.AccountSetup.TransferAccount')}
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountInformation)
            }}
          />
        </View>
      )}
    </ScreenWrapper>
  )
}

export default AccountSetupSelectionScreen
