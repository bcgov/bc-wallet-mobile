import { Button, ButtonType, useTheme } from '@bifold/core'
import { useState } from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'

export const IntroCarouselScreen: React.FC = () => {
  const theme = useTheme()
  const [carouselIndex, setCarouselIndex] = useState(0)

  const styles = StyleSheet.create({})

  return (
    <SafeAreaView>
      <Button title={'Back'} buttonType={ButtonType.Secondary}></Button>
      <Button title={'Continue'} buttonType={ButtonType.Secondary}></Button>
    </SafeAreaView>
  )
}

export default IntroCarouselScreen
