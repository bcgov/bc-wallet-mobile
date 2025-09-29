import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet } from 'react-native'

const TransferSuccessScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCTabStackParams>>()
  return (
    <StatusDetails
      title={`QR code scan complete`}
      description={`The app should be set up on your other mobile device.`}
      extraText={`If you no longer need to use the app on this device, you can remove your account.`}
      buttonText={'Ok'}
      onButtonPress={() => {
        navigation.navigate(BCSCScreens.Home)
      }}
    />
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

export default TransferSuccessScreen
