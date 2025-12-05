import { useDeepLinkViewModel } from '@/bcsc-theme/features/deep-linking'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

export const HelloWorld: React.FC = () => {
  const navigation = useNavigation()
  const deepLinkViewModel = useDeepLinkViewModel()

  const handleClose = () => {
    deepLinkViewModel.clearPendingDeepLink()
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
      <Button title="Close" onPress={handleClose} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
})

export default HelloWorld
