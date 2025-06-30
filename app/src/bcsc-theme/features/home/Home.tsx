import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useStore, useTheme } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import HomeHeader from './components/HomeHeader'
import SavedServices from './components/SavedServices'
import SectionButton from './components/SectionButton'
import { StackScreenProps } from '@react-navigation/stack'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { mockServices } from '@/bcsc-theme/fixtures/services'
import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import useApi from '@/bcsc-theme/api/hooks/useApi'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockFindTitle = 'Where to use'
const mockFindDescription = 'Find the websites you can log in to with this app.'
const mockLogInTitle = 'Log in from a computer'
const mockLogInDescription =
  'Enter pairing code to log in from a different device – like a computer, laptop, or tablet.'

const mockGetUserInfo: () => Promise<Partial<UserInfoResponseData>> = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return {
    given_name: 'JAIME ANN',
    family_name: 'LEE-RODRIGUEZ',
    card_expiry: '2028-09-19',
    card_type: 'BC Services Card with photo',
    address: '123 LEDSHAM RD\nVICTORIA, BC V9B 1W8',
    birthdate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 28)
      .toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
      .toUpperCase(),
  }
}

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { user } = useApi()
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Partial<UserInfoResponseData>>({})

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        setLoading(true)
        // const userInfo = await user.getUserInfo()
        const userInfo = await mockGetUserInfo()
        setUserInfo(userInfo)
      } catch (error) {
        console.error('Error fetching user info:', error)
        // Handle error appropriately, e.g., show an alert or log it
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [])
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
