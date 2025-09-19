import useApi from '@/bcsc-theme/api/hooks/useApi'
import SectionButton from '@/bcsc-theme/components/SectionButton'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native'
import AccountField from './components/AccountField'
import AccountPhoto from './components/AccountPhoto'

type AccountNavigationProp = StackNavigationProp<BCSCRootStackParams>

/**
 * Renders the account screen component, which displays user information and provides navigation to account-related actions.
 *
 * @returns {*} {JSX.Element} The account screen component.
 */
const Account: React.FC = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { user, metadata } = useApi()
  const client = useBCSCApiClient()
  const navigation = useNavigation<AccountNavigationProp>()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const getQuickLoginURL = useQuickLoginURL()

  const openedAccountWebview = useRef(false)

  const { load: loadBcscServiceClient, data: bcscServiceClient } = useDataLoader(metadata.getBCSCClientMetadata, {
    onError: (error) => logger.error('Error loading BCSC client metadata', error as Error),
  })

  /**
   * Fetches user metadata and picture URI.
   *
   * @return {*} {Promise<{ user: UserInfoResponseData; picture?: string }>} An object containing user metadata and optional picture URI.
   */
  const fetchUserMetadata = useCallback(async () => {
    let pictureUri: string | undefined
    const userMetadata = await user.getUserInfo()

    if (userMetadata.picture) {
      pictureUri = await user.getPicture(userMetadata.picture)
    }

    return { user: userMetadata, picture: pictureUri }
  }, [user])

  const {
    load: loadUserMeta,
    refresh: refreshUserMeta,
    ...userMeta
  } = useDataLoader(fetchUserMetadata, {
    onError: (error) => logger.error('Error loading user info or picture', error as Error),
  })

  // Initial data load
  useEffect(() => {
    loadUserMeta()
    loadBcscServiceClient()
  }, [loadUserMeta, loadBcscServiceClient])

  // Refresh user data when returning to this screen from the BCSC Account webview
  useEffect(() => {
    const appListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && openedAccountWebview.current) {
        logger.info('Returning from Account webview, refreshing user info...')
        openedAccountWebview.current = false
        refreshUserMeta()
      }
    })

    // cleanup event listener on unmount
    return () => appListener.remove()
  }, [logger, refreshUserMeta])

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
      if (!bcscServiceClient) {
        // only generate quick login url if we have the bcsc service client metadata
        return
      }

      const quickLoginResult = await getQuickLoginURL(bcscServiceClient)

      if (quickLoginResult.success) {
        await Linking.openURL(quickLoginResult.url)
        openedAccountWebview.current = true
      }
    } catch (error) {
      logger.error(`Error opening All Account Details: ${error}`)
    }
  }, [logger, getQuickLoginURL, bcscServiceClient])

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
      {userMeta.isLoading ? (
        <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
      ) : (
        <View style={styles.container}>
          <View style={styles.photoAndNameContainer}>
            {/*TODO (MD): fallback for when this is undefined (silhouette) */}
            <AccountPhoto photoUri={userMeta.data?.picture} />
            <ThemedText variant={'headingTwo'} style={styles.name}>
              {userMeta.data?.user?.family_name}, {userMeta.data?.user.given_name}
            </ThemedText>
          </View>
          <ThemedText
            style={styles.warning}
          >{`This cannot be used as photo ID, a driver's licence, or a health card.`}</ThemedText>
          <AccountField label={'App expiry date'} value={userMeta.data?.user.card_expiry ?? ''} />
          <AccountField label={'Account type'} value={userMeta.data?.user.card_type ?? 'Non BC Services Card'} />
          <AccountField label={'Address'} value={userMeta.data?.user.address?.formatted ?? ''} />
          <AccountField label={'Date of birth'} value={userMeta.data?.user.birthdate ?? ''} />
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
                navigation.navigate(BCSCScreens.TransferAccountQRInformation)
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
