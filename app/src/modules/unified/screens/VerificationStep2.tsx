import { Text, View, StyleSheet } from 'react-native'

const Step2Screen: React.FC = () => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
    },
    text: {
      fontSize: 24,
    },
  })

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Placeholder</Text>
    </View>
  )
}

export default Step2Screen
