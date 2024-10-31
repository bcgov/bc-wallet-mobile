import { Text, View, StyleSheet } from 'react-native'

const VerifyIdentityStepScreen: React.FC = () => {
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

export default VerifyIdentityStepScreen
