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

const Account: React.FC = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { user } = useApi()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<UserInfoResponseData | null>(null)
  const [pictureUri, setPictureUri] = useState<string>()

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        setLoading(true)

        const userInfo = await user.getUserInfo()
        let picture = ''
        if (userInfo.picture) {
          picture = await user.getPicture(userInfo.picture)
        }
        setUserInfo(userInfo)
        setPictureUri(picture)
      } catch (error) {
        console.error('Error fetching user info:', error)
        // TODO: Handle error appropriately, e.g., show an alert or log it
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
      {loading && userInfo ? (
        <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
      ) : (
        <View style={styles.container}>
          <View style={styles.photoAndNameContainer}>
            <AccountPhoto photoUri={pictureUri} />
            <ThemedText variant={'headingTwo'} style={styles.name}>
              {userInfo?.family_name}, {userInfo?.given_name}
            </ThemedText>
          </View>
          <ThemedText style={styles.warning}>{mockWarning}</ThemedText>
          <AccountField label={'App expiry date'} value={userInfo?.card_expiry ?? ''} />
          <AccountField label={'Account type'} value={userInfo?.card_type ?? ''} />
          <AccountField label={'Address'} value={userInfo?.address?.formatted ?? ''} />
          <AccountField label={'Date of birth'} value={userInfo?.birthdate ?? ''} />
          <AccountField label={'Email address'} value={store.bcsc.email ?? ''} />
        </View>
      )}
    </TabScreenWrapper>
  )
}

export default Account
