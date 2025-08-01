import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme, ThemedText, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import AccountPhoto from './components/AccountPhoto'
import AccountField from './components/AccountField'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import { BCState } from '@/store'
import { BCSCScreens, BCSCRootStackParams } from '@/bcsc-theme/types/navigators'
import client from '@/bcsc-theme/api/client'
import { createQuickLoginJWT, getAccount } from 'react-native-bcsc-core'
import { getNotificationTokens } from '@/bcsc-theme/utils/push-notification-tokens'
import SectionButton from '@/bcsc-theme/components/SectionButton'
import { JWK } from '@/bcsc-theme/api/hooks/useJwksApi'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const mockWarning = `This cannot be used as photo ID, a driver's licence, or a health card.`

const Account: React.FC = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { user, jwks, metadata } = useApi()
  const navigation = useNavigation<AccountNavigationProp>()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<UserInfoResponseData | null>(null)
  const [pictureUri, setPictureUri] = useState<string>()
  const [publicKey, setPublicKey] = useState<JWK | null>(null)
  const [clientMetadata, setClientMetadata] = useState<ClientMetadata[]>([])
  const deviceCount = 1

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

        const key = await jwks.getFirstJwk()
        if (!key) {
          throw new Error('No JWK found')
        }
        setPublicKey(key)
        const clients = await metadata.getClientMetadata()
        setClientMetadata(clients)
      } catch (error) {
        console.error('Error fetching user info, client metadata, or key:', error)
        // TODO: Handle error appropriately, e.g., show an alert or log it
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [user])

  const getLoginHintForEndpoint = async (endpoint: string) => {
    const { apnsToken, fcmDeviceToken } = await getNotificationTokens()
    const account = await getAccount()

    if (!account?.clientID || !account?.issuer) {
      throw new Error('Account information is missing or incomplete')
    }

    if (!client.tokens?.access_token) {
      throw new Error('Access token is missing')
    }

    const uri = `${client.baseURL}/${endpoint}`
    console.log('uri:', uri)
    const validClients = clientMetadata.filter(c => c.client_uri === uri)
    console.log('validClients:', validClients)
    const clientRefId = clientMetadata.filter(c => c.client_uri === uri)[0].client_ref_id

    console.log('Creating JWT with:')
    console.log('- clientID:', account.clientID)
    console.log('- issuer:', account.issuer)
    console.log('- clientRefId:', clientRefId)
    console.log('- access_token length:', client.tokens.access_token.length)
    console.log('- fcmDeviceToken length:', fcmDeviceToken.length)
    console.log('- apnsToken:', apnsToken ? `${apnsToken.length} chars` : 'null')
    console.log('- key:', publicKey)

    if (!publicKey) {
      throw new Error('No JWK available for encryption')
    }

    const hint = await createQuickLoginJWT(
      client.tokens.access_token,
      account.clientID,
      account.issuer,
      clientRefId,
      publicKey,
      fcmDeviceToken,
      apnsToken
    )
    
    return hint
  }

  const handleMyDevicesPress = async () => {
    try {
      const fullUrl = `${client.baseURL}/account/embedded/devices`
      console.log('Full URL length:', fullUrl.length)
      console.log('Full URL:', fullUrl)

      navigation.navigate(BCSCScreens.AccountWebView, {
        url: fullUrl,
      })
    } catch (error) {
      console.error('Error creating login hint for My Devices:', error)
    }
  }

  const handleAllAccountDetailsPress = async () => {
    try {
      const loginHint = await getLoginHintForEndpoint('account/')
      const encodedHint = encodeURIComponent(loginHint)

      const fullUrl = `${client.baseURL}/login/initiate?login_hint=${encodedHint}`
      console.log('Full URL length:', fullUrl.length)
      console.log('Full URL:', fullUrl)

      navigation.navigate(BCSCScreens.AccountWebView, {
        url: fullUrl,
      })
    } catch (error) {
      console.error('Error creating login hint for All Account Details:', error)
    }
  }

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
    buttonsContainer: {
      gap: Spacing.md,
      marginTop: Spacing.lg,
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

          <View style={styles.buttonsContainer}>
            <SectionButton onPress={handleMyDevicesPress} title={`My devices (${deviceCount})`} />
            <SectionButton
              onPress={handleAllAccountDetailsPress}
              title="All account details"
              description={'View your account activity, manage your email address, and more.'}
            />
          </View>
        </View>
      )}
    </TabScreenWrapper>
  )
}

export default Account
