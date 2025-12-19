import useApi from '@/bcsc-theme/api/hooks/useApi'
import SectionButton from '@/bcsc-theme/components/SectionButton'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useIdToken } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Linking, StyleSheet, View } from 'react-native'
import AccountField from './components/AccountField'
import AccountPhoto from './components/AccountPhoto'

type AccountNavigationProp = StackNavigationProp<BCSCMainStackParams>

/**
 * Renders the account screen component, which displays user information and provides navigation to account-related actions.
 *
 * @returns {*} {JSX.Element} The account screen component.
 */
const Account: React.FC = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { metadata } = useApi()
  const client = useBCSCApiClient()
  const navigation = useNavigation<AccountNavigationProp>()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const getQuickLoginURL = useQuickLoginURL()
  const account = useAccount()
  const { idToken, refreshIdToken } = useIdToken()

  const openedWebview = useRef(false)

  const { load: loadBcscServiceClient, data: bcscServiceClient } = useDataLoader(metadata.getBCSCClientMetadata, {
    onError: (error) => logger.error('Error loading BCSC client metadata', error as Error),
  })

  // Initial data load
  useEffect(() => {
    loadBcscServiceClient()
  }, [loadBcscServiceClient])

  useFocusEffect(
    useCallback(() => {
      logger.info('Account screen focused, refreshing ID token metadata...')
      refreshIdToken()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logger])
  )

  // Refresh user data when returning to this screen from the BCSC Account webview
  useEffect(() => {
    // This AppState listener handles state transitions for enterting/ exiting the background
    const appListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && openedWebview.current) {
        logger.info('Returning from background, refreshing user and device metadata...')
        openedWebview.current = false
        refreshIdToken()
      }
    })

    // cleanup event listener on unmount
    return () => appListener.remove()
  }, [logger, refreshIdToken])

  const handleMyDevicesPress = useCallback(async () => {
    try {
      navigation.navigate(BCSCScreens.MainWebView, {
        url: client.endpoints.accountDevices,
        title: t('BCSC.Account.AccountInfo.ManageDevices'),
      })
      openedWebview.current = true
    } catch (error) {
      logger.error(`Error navigating to My Devices webview: ${error}`)
    }
  }, [client, navigation, logger, t])

  const handleAllAccountDetailsPress = useCallback(async () => {
    try {
      if (!bcscServiceClient) {
        // only generate quick login url if we have the bcsc service client metadata
        return
      }

      const quickLoginResult = await getQuickLoginURL(bcscServiceClient)

      if (quickLoginResult.success) {
        await Linking.openURL(quickLoginResult.url)
        openedWebview.current = true
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
      <View style={styles.container}>
        <View style={styles.photoAndNameContainer}>
          {/*TODO (MD): fallback for when this is undefined (silhouette) */}
          <AccountPhoto photoUri={account.picture} />
          <ThemedText variant={'headingTwo'} style={styles.name}>
            {account.family_name}, {account.given_name}
          </ThemedText>
        </View>
        <ThemedText style={styles.warning}>{t('BCSC.Account.AccountInfo.Description')}</ThemedText>
        <AccountField label={t('BCSC.Account.AccountInfo.AppExpiryDate')} value={account.card_expiry ?? ''} />
        <AccountField
          label={t('BCSC.Account.AccountInfo.AccountType')}
          value={account.card_type ?? t('BCSC.Account.AccountInfo.AccountTypeNonBCServicesCard')}
        />
        <AccountField label={t('BCSC.Account.AccountInfo.Address')} value={account.address?.formatted ?? ''} />
        <AccountField label={t('BCSC.Account.AccountInfo.DateOfBirth')} value={account.birthdate ?? ''} />
        <AccountField label={t('BCSC.Account.AccountInfo.EmailAddress')} value={store.bcscSecure.email ?? ''} />

        <View style={styles.buttonsContainer}>
          <SectionButton
            onPress={handleMyDevicesPress}
            title={
              typeof idToken?.bcsc_devices_count === 'number'
                ? t('BCSC.Account.AccountInfo.MyDevicesCount', { count: idToken.bcsc_devices_count })
                : t('BCSC.Account.AccountInfo.MyDevices')
            }
          />
          <SectionButton
            onPress={() => {
              navigation.navigate(BCSCScreens.TransferAccountQRInformation)
            }}
            title={t('BCSC.Account.TransferAccount')}
          />
          <SectionButton
            onPress={handleAllAccountDetailsPress}
            title={t('BCSC.Account.AccountDetails')}
            description={t('BCSC.Account.AccountDetailsDescription')}
          />
          <SectionButton
            onPress={() => navigation.navigate(BCSCScreens.RemoveAccountConfirmation)}
            title={t('BCSC.Account.RemoveAccount')}
          />
        </View>
      </View>
    </TabScreenWrapper>
  )
}

export default Account
