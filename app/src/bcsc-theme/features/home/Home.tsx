import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

/**
 * Home screen for 4.1+ - currently just a placeholder
 *
 * @returns JSX.Element
 */
const Home: React.FC<HomeProps> = () => {
  return <TabScreenWrapper></TabScreenWrapper>
}

export default Home
