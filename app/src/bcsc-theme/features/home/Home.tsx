import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme, useServices, TOKENS } from '@bifold/core'
import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader'
import SavedServices from './components/SavedServices'
import SectionButton from '../../components/SectionButton'
import { StackScreenProps } from '@react-navigation/stack'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockFindTitle = 'Where to use'
const mockFindDescription = 'Find the websites you can log in to with this app.'
const mockLogInTitle = 'Log in from a computer'
const mockLogInDescription =
  'Enter pairing code to log in from a different device – like a computer, laptop, or tablet.'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { Spacing } = useTheme()
  const { user } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const {
    load: loadUserInfo,
    data: userInfo,
    isLoading,
  } = useDataLoader(user.getUserInfo, {
    onError(error) {
      logger.error(`Error while fetching user info: ${error}`)
    },
  })

  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  const styles = StyleSheet.create({
    buttonsContainer: {
      padding: Spacing.md,
    },
  })

  const handleWhereToUsePress = () => {
    navigation.navigate(BCSCScreens.Services)
  }

  const handlePairingCodePress = () => {
    navigation.getParent()?.navigate(BCSCScreens.ManualPairingCode)
  }

  return (
    <TabScreenWrapper>
      {isLoading ? (
        <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
      ) : (
        <>
          {/* <AppBanner messages={banners.bannerMessages} /> */}

          <HomeHeader name={`${userInfo?.family_name}, ${userInfo?.given_name}`} />
          <View style={styles.buttonsContainer}>
            <SectionButton
              title={mockFindTitle}
              description={mockFindDescription}
              style={{ marginBottom: Spacing.md }}
              onPress={handleWhereToUsePress}
            />
            <SectionButton title={mockLogInTitle} description={mockLogInDescription} onPress={handlePairingCodePress} />
          </View>
          <SavedServices />
        </>
      )}
    </TabScreenWrapper>
  )
}

export default Home
