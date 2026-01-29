import { useNavigation } from '@react-navigation/native'
import React from 'react'

import { SystemModal } from '../../modal/components/SystemModal'

const CancelledReview: React.FC = () => {
  const navigation = useNavigation()

  const handleReturnHome = () => {
    navigation.navigate('Home' as never)
  }

  return (
    <SystemModal
      iconName="phonelink-erase"
      headerText="Butts"
      contentText={['Where does this go', 'What about this one']}
      buttonText="OK"
      onButtonPress={() => {
        console.log('OK WAS PRESSED')
      }}
    />
  )
}

export default CancelledReview
