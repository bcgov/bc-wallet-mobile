import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const AccountSetupSelectionScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()
  const { ColorPalette, themeName, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <GenericCardImage />
      <ThemedText variant="headerTitle" style={{ color: 'white' }}>
        BC Services Card Account
      </ThemedText>

      <Button
        buttonType={ButtonType.Primary}
        title="Create new Account"
        onPress={() => {
          navigation.navigate(BCSCScreens.SetupSteps)
        }}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title="Transfer Account From Another Device"
        onPress={() => {
          navigation.navigate(BCSCScreens.TransferAccountInformation)
        }}
      />
    </View>
  )
}

export default AccountSetupSelectionScreen
