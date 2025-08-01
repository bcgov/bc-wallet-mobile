import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useStore, useTheme, useServices, TOKENS } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader'
import SavedServices from './components/SavedServices'
import SectionButton from '../../components/SectionButton'
import { StackScreenProps } from '@react-navigation/stack'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { mockServices } from '@/bcsc-theme/fixtures/services'
import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { NotificationBannerContainer } from './components/NotificationBannerContainer'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockFindTitle = 'Where to use'
const mockFindDescription = 'Find the websites you can log in to with this app.'
const mockLogInTitle = 'Log in from a computer'
const mockLogInDescription =
  'Enter pairing code to log in from a different device – like a computer, laptop, or tablet.'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { user } = useApi()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<Partial<UserInfoResponseData>>({})
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // Fetch user info and update the user state
  useEffect(() => {
    const asyncEffect = async () => {
      try {
        setLoading(true)
        const userInfo = await user.getUserInfo()
        setUserInfo(userInfo)
      } catch (error) {
        logger.error(`Error while fetching user info`)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [user, logger])

  // replace with API response
  const savedServices = mockServices.filter((service) =>
    store.bcsc.bookmarks.some((serviceId) => serviceId === service.id)
  )

  const styles = StyleSheet.create({
    buttonsContainer: {
      padding: Spacing.md,
    },
  })

  const handlePairingCodePress = () => {
    navigation.getParent()?.navigate(BCSCScreens.ManualPairingCode)
  }

  return (
    <TabScreenWrapper>
      {loading ? (
        <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
      ) : (
        <>
          <NotificationBannerContainer />
          <HomeHeader name={`${userInfo.family_name}, ${userInfo.given_name}`} />
          <View style={styles.buttonsContainer}>
            <SectionButton
              title={mockFindTitle}
              description={mockFindDescription}
              style={{ marginBottom: Spacing.md }}
              onPress={() => null}
            />
            <SectionButton title={mockLogInTitle} description={mockLogInDescription} onPress={handlePairingCodePress} />
          </View>
          <SavedServices services={savedServices} />
        </>
      )}
    </TabScreenWrapper>
  )
}

export default Home
