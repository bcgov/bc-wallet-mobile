import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'

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
export default TransferSuccessScreen
