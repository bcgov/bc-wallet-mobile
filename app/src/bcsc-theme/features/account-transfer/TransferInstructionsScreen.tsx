import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

const TransferInstructionsScreen: React.FC = () => {
  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.text}>TransferInstructionsScreen (stub)</Text>
      </View>
    </ScrollView>
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

export default TransferInstructionsScreen
