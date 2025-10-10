import { useTheme } from '@react-navigation/native'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const CreatePINScreen: React.FC = () => {
  const theme = useTheme()

  const styles = StyleSheet.create({})

  return (
    <SafeAreaView>
      <ScrollView></ScrollView>
    </SafeAreaView>
  )
}
