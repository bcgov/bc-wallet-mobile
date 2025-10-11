import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '@bifold/core'

export const CreatePINScreen: React.FC = () => {
  const theme = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: theme.Spacing.md,
    },
  })

  return (
    <SafeAreaView>
      <ScrollView style={styles.container}></ScrollView>
    </SafeAreaView>
  )
}
