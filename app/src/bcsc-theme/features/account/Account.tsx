import useApi from '@/bcsc-theme/api/hooks/useApi'
import { UserInfoResponseData } from '@/bcsc-theme/api/hooks/useUserApi'
import SectionButton from '@/bcsc-theme/components/SectionButton'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useQuickLoginUrl from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native'
import AccountField from './components/AccountField'
import AccountPhoto from './components/AccountPhoto'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

const Account: React.FC = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const client = useBCSCApiClient()
  const { user } = useApi()
  const navigation = useNavigation<AccountNavigationProp>()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<UserInfoResponseData | null>(null)
  const [pictureUri, setPictureUri] = useState<string>()
  const url = useQuickLoginUrl('account/')
  const { t } = useTranslation()

  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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
        logger.error(`Error fetching user info, client metadata, or key: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    asyncEffect()
  }, [user, logger])

  const handleMyDevicesPress = useCallback(async () => {
    try {
      const fullUrl = `${client.baseURL}/account/embedded/devices`
      navigation.navigate(BCSCScreens.WebView, {
        url: fullUrl,
        title: 'Manage Devices',
      })
    } catch (error) {
      logger.error(`Error navigating to My Devices webview: ${error}`)
    }
  }, [client, navigation, logger])

  const handleAllAccountDetailsPress = useCallback(async () => {
    try {
      if (url) {
        await Linking.openURL(url)
      }
    } catch (error) {
      logger.error(`Error opening All Account Details: ${error}`)
    }
  }, [url, logger])

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
          <ThemedText
            style={styles.warning}
          >{`This cannot be used as photo ID, a driver's licence, or a health card.`}</ThemedText>
          <AccountField label={'App expiry date'} value={userInfo?.card_expiry ?? ''} />
          <AccountField label={'Account type'} value={userInfo?.card_type ?? ''} />
          <AccountField label={'Address'} value={userInfo?.address?.formatted ?? ''} />
          <AccountField label={'Date of birth'} value={userInfo?.birthdate ?? ''} />
          <AccountField label={'Email address'} value={store.bcsc.email ?? ''} />

          <View style={styles.buttonsContainer}>
            <SectionButton
              onPress={handleMyDevicesPress}
              title={
                store.bcsc.bcscDevicesCount !== undefined ? `My devices (${store.bcsc.bcscDevicesCount})` : 'My devices'
              }
            />
            <SectionButton
              onPress={() => {
                navigation.navigate(BCSCScreens.TransferAccountInformation)
              }}
              title={'Transfer account to another device'}
            />
            <SectionButton
              onPress={handleAllAccountDetailsPress}
              title="All account details"
              description={'View your account activity, manage your email address, and more.'}
            />
            <SectionButton
              onPress={() => navigation.navigate(BCSCScreens.RemoveAccountConfirmation)}
              title={t('Unified.Account.RemoveAccount')}
            />
          </View>
        </View>
      )}
    </TabScreenWrapper>
  )
}

export default Account
