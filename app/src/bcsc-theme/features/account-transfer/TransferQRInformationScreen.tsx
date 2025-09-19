import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const TransferQRInformationScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>TransferQRInformationScreen (stub)</Text>
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
