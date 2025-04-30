import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader'
import MessageBanner from './components/MessageBanner'
import SavedServices from './components/SavedServices'
import SectionButton from './components/SectionButton'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockName = 'LEE-MARTINEZ, JAIME ANN'
const mockFindTitle = 'Where to use'
const mockFindDescription = 'Find the websites you can log in to with this app.'
const mockLogInTitle = 'Log in from a computer'
const mockLogInDescription =
  'Enter pairing code to log in from a different device – like a computer, laptop, or tablet.'

const Home: React.FC = () => {
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    buttonsContainer: {
      padding: Spacing.md,
    },
  })

  return (
    <TabScreenWrapper>
      <HomeHeader name={mockName} />
      <MessageBanner messages={[{ msg: '1 new message', type: 'info' }]} />
      <View style={styles.buttonsContainer}>
        <SectionButton
          title={mockFindTitle}
          description={mockFindDescription}
          style={{ marginBottom: Spacing.md }}
          onPress={() => null}
        />
        <SectionButton title={mockLogInTitle} description={mockLogInDescription} onPress={() => null} />
      </View>
      <SavedServices />
    </TabScreenWrapper>
  )
}

export default Home
