import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme, ThemedText, useStore } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import AccountPhoto from './components/AccountPhoto'
import AccountField from './components/AccountField'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import { BCState } from '@/store'

const mockWarning = `This cannot be used as photo ID, a driver's licence, or a health card.`

const mockGetUserInfo: () => Promise<Partial<UserInfoResponseData>> = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return {
    given_name: 'JAIME ANN',
    family_name: 'LEE-RODRIGUEZ',
    card_expiry: '2028-09-19',
    card_type: 'BC Services Card with photo',
    address: '123 LEDSHAM RD\nVICTORIA, BC V9B 1W8',
    picture: 'https://picsum.photos/130/180',
    birthdate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 28).toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
  }
}

const Account: React.FC = () => {
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

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
    },
    photoAndNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      marginLeft: Spacing.sm,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    warning: {
      marginTop: Spacing.sm,
    },
  })

  return (
    <TabScreenWrapper>
      {loading ? (
        <ActivityIndicator
          size={'large'}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
      ) : (
      <View style={styles.container}>
        <View style={styles.photoAndNameContainer}>
          <AccountPhoto photoUri={userInfo.picture} />
          <ThemedText variant={'headingTwo'} style={styles.name}>
            {userInfo.family_name}, {userInfo.given_name}
          </ThemedText>
        </View>
        <ThemedText style={styles.warning}>{mockWarning}</ThemedText>
        <AccountField
          label={'App expiry date'}
          value={userInfo.card_expiry ?? ''}
        />
        <AccountField
          label={'Account type'}
          value={userInfo.card_type ?? ''}
        />
        <AccountField
          label={'Address'}
          value={userInfo.address ?? ''}
        />
        <AccountField
          label={'Date of birth'}
          value={userInfo.birthdate ?? ''}
        />
        <AccountField
          label={'Email address'}
          value={store.bcsc.email ?? ''}
        />
      </View>
      )}
    </TabScreenWrapper>
  )
}

export default Account
