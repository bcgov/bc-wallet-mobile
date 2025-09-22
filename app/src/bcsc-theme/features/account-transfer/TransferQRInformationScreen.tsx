import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet, View } from 'react-native'

const TransferQRInformationScreen: React.FC = () => {
  const { ColorPalette, themeName, Spacing } = useTheme()
  const navigation = useNavigation<StackNavigationProp<BCSCRootStackParams>>()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.md,
    },
  })
  return (
    <View style={styles.container}>
      <ThemedText variant="headerTitle">Open the BC Services Card app on your other mobile device</ThemedText>
      <ThemedText>Scan the QR code with the BC Services Card app on your other mobile device.</ThemedText>
      <ThemedText>Do not scan with the camera app.</ThemedText>

      <View style={{ margin: Spacing.lg, gap: Spacing.sm, width: '100%' }}>
        <Button
          buttonType={ButtonType.Primary}
          title="GET QR Code"
          onPress={() => {
            navigation.navigate(BCSCScreens.TransferAccountQRDisplay)
          }}
        />
      </View>

      <View style={{ margin: Spacing.lg, gap: Spacing.sm, width: '100%' }}>
        <Button
          buttonType={ButtonType.Tertiary}
          title="Learn more"
          onPress={() => {
            // TODO: (Alfred) BCSC opens a web page inside the app, it doens't open the page in the mobile browser
            console.log("OPEN AN EXTERNAL LINK TO 'LEARN MORE'")
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
})

export default TransferQRInformationScreen
