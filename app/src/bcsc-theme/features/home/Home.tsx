import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader'
import MessageBanner from './components/MessageBanner'
import SavedServices from './components/SavedServices'
import SectionButton from './components/SectionButton'

const Home: React.FC = () => {
  const { Spacing } = useTheme()
  
  const styles = StyleSheet.create({
    buttonsContainer: {
      padding: Spacing.md,
    }
  })
  
  return (
    <TabScreenWrapper>
      <HomeHeader name={'MCMATH, BRYCE JAMUS'} />
      <MessageBanner messages={[{ msg: '1 new message', type: 'info' }]} />
      <View style={styles.buttonsContainer}>
        <SectionButton 
          title={'Where to use'} 
          description={'Find the websites you can log in to with this app.'} 
          style={{ marginBottom: Spacing.md }}
          onPress={() => null}
        />
        <SectionButton 
          title={'Log in from a computer'} 
          description={'Enter pairing code to log in from a different device – like a computer, laptop, or tablet.'}
          onPress={() => null} 
        />
      </View>
      <SavedServices />
    </TabScreenWrapper>
  )
}

export default Home