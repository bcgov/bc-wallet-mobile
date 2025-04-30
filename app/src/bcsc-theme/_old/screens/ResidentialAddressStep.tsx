import { StyleSheet, Text, View } from 'react-native'

const ResidentialAddressScreen: React.FC = () => {
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

export default ResidentialAddressScreen
