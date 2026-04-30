import { QRRenderer } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useWindowDimensions } from 'react-native'

const QRDisplay: React.FC = () => {
  const { width } = useWindowDimensions()
  const qrSize = width - 80

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <QRRenderer value="https://placeholder.example.com" size={qrSize} />
    </View>
  )
}

export default QRDisplay
