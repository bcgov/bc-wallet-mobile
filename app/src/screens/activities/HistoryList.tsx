import { useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const HistoryList: React.FC = () => {
  const { TextTheme } = useTheme()

  const styles = StyleSheet.create({
    historyContent: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    historyText: {
      fontSize: TextTheme.normal.fontSize,
      color: TextTheme.normal.color,
    },
  })
  // TODO: Page d'historique
  return (
    <View style={styles.historyContent}>
      <Text style={styles.historyText}>Historique des notifications</Text>
    </View>
  )
}

export default HistoryList
