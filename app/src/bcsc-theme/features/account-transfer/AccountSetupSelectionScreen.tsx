import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const AccountSetupSelectionScreen: React.FC = () => {
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsContainer: {
      marginTop: 'auto',
      width: '100%',
      gap: Spacing.sm,
    },
  })

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.contentContainer}>
        <GenericCardImage />
        <ThemedText variant={'headerTitle'}>{t('Unified.AccountSetup.Title')}</ThemedText>
      </View>

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
    </SafeAreaView>
  )
}

export default AccountSetupSelectionScreen
