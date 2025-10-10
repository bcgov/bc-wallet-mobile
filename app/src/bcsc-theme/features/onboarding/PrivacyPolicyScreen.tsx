import { useTheme } from '@bifold/core'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const PrivacyPolicyScreen: React.FC = () => {
  const theme = useTheme()

  const styles = StyleSheet.create({})

  return (
    <SafeAreaView>
      <ScrollView></ScrollView>
    </SafeAreaView>
  )
}
