import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { BCThemeNames } from '@/constants'
import { BCDispatchAction, BCState, Mode } from '@/store'
import { Button, ButtonType, useAuth, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'

// Placeholder for now, not sure if we want to reuse our
// existing settings screen or create a new one, prob create new
const Settings: React.FC = () => {
  const { Spacing, setTheme, themeName } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { lockOutUser } = useAuth()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: Spacing.md,
    },
  })

  const onPressMode = () => {
    lockOutUser()
    setTheme(BCThemeNames.BCWallet)
    dispatch({ type: BCDispatchAction.UPDATE_MODE, payload: [Mode.BCWallet] })
  }

  const onPressTheme = () => {
    if (themeName === BCThemeNames.BCSC) {
      setTheme(BCThemeNames.BCWallet)
    } else {
      setTheme(BCThemeNames.BCSC)
    }
  }

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <View style={{ marginBottom: Spacing.md }}>
          <Button
            title={'Use BC Wallet Mode'}
            accessibilityLabel={'Use BC Wallet Mode'}
            buttonType={ButtonType.Primary}
            onPress={onPressMode}
          />
        </View>
        <Button
          title={'Switch Theme'}
          accessibilityLabel={'Switch Theme'}
          buttonType={ButtonType.Secondary}
          onPress={onPressTheme}
        />
      </View>
    </TabScreenWrapper>
  )
}

export default Settings
