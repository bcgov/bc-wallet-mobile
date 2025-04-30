import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Skin } from '@/store'
import { Button, ButtonType, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'

// Placeholder for now, not sure if we want to reuse our 
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { Spacing, setTheme } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const styles = StyleSheet.create({
    buttonContainer: {
      margin: Spacing.md,
    },
  })

  const onPress = () => {
    setTheme(BCThemeNames.BCWallet)
    dispatch({ type: BCDispatchAction.UPDATE_SKIN, payload: [Skin.BCWallet] })
  }

  return (
    <TabScreenWrapper>
      <View style={styles.buttonContainer}>
        <Button
          title={'Use BC Wallet Skin'}
          accessibilityLabel={'Use BC Wallet Skin'}
          buttonType={ButtonType.Primary}
          onPress={onPress}
        />
      </View>
    </TabScreenWrapper>
  )
}

export default Settings
