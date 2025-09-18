import { ScanCamera } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TransferQRScannerScreen: React.FC = () => {
  const handleScan = async (value: string) => {
    console.log(value)
  }
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View></View>
        <ScanCamera handleCodeScan={handleScan} />
      </View>
    </SafeAreaView>
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

export default TransferQRScannerScreen
