import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'

import { isAccountExpired } from '@/bcsc-theme/utils/datetime-utils'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, AppStateStatus, Linking, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import AccountField from './components/AccountField'
import AccountPhoto from './components/AccountPhoto'

interface AccountDetailsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountDetails>
}

const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, Buttons } = useTheme()
  const { metadata } = useApi()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { account, refreshAccount } = useAccount()
  const alerts = useAlerts(navigation)
  const getQuickLoginURL = useQuickLoginURL()
  const [isDisabled, setIsDisabled] = useState(false)
  const openedWebview = useRef(false)

  const { load: loadBcscServiceClient, data: bcscServiceClient } = useDataLoader(metadata.getBCSCClientMetadata, {
    onError: (error) => logger.error('Error loading BCSC client metadata', error as Error),
  })

  useEffect(() => {
    loadBcscServiceClient()
  }, [loadBcscServiceClient])

  // Refresh user data when returning from the BCSC Account webview
  useEffect(() => {
    const appListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && openedWebview.current) {
        openedWebview.current = false
        setIsDisabled(false)
        refreshAccount()
      }
    })
    return () => appListener.remove()
  }, [refreshAccount])

  const openAccountWebview = useCallback(async () => {
    setIsDisabled(true)
    try {
      if (!bcscServiceClient) {
        return
      }
      const result = await getQuickLoginURL(bcscServiceClient)
      if (result.success) {
        await Linking.openURL(result.url)
        openedWebview.current = true
      } else if ('error' in result) {
        logger.debug(`AccountDetails: error generating quick login URL: ${result.error}`)
        alerts.loginServerErrorAlert()
      }
    } catch (error) {
      logger.error(`Error opening account webview: ${error}`)
      alerts.loginServerErrorAlert()
    } finally {
      setIsDisabled(false)
    }
  }, [alerts, bcscServiceClient, getQuickLoginURL, logger])

  const onEditNickname = useCallback(() => {
    navigation.navigate(BCSCScreens.EditNickname)
  }, [navigation])

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.lg,
    },
    photoAndNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    name: {
      flexShrink: 1,
      flexWrap: 'wrap',
      color: ColorPalette.brand.headerText,
    },
    warning: {
      marginTop: Spacing.lg,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
      flexShrink: 1,
    },
  })

  if (!account) {
    return <LoadingScreen />
  }

  const nickname = store.bcsc.selectedNickname?.trim() ?? ''
  const expiryValue = isAccountExpired(account.account_expiration_date)
    ? t('BCSC.AccountExpired.StaticBannerTitle')
    : account.card_expiry
  const accountType = account.card_type ?? t('BCSC.Account.AccountInfo.AccountTypeNonBCServicesCard')

  const controls = (
    <ControlContainer>
      <Button
        title={''}
        buttonType={ButtonType.Secondary}
        onPress={openAccountWebview}
        accessibilityLabel={t('BCSC.AccountDetails.SeeFullDetails')}
        accessibilityHint={t('Global.A11y.OpensInBrowser')}
        testID={testIdWithKey('SeeFullAccountDetails')}
        disabled={isDisabled || !bcscServiceClient}
      >
        <View style={styles.buttonContent}>
          <ThemedText style={Buttons.secondaryText}>{t('BCSC.AccountDetails.SeeFullDetails')}</ThemedText>
          <Icon name="open-in-new" size={24} color={Buttons.secondaryText.color} />
        </View>
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={styles.container}>
      <View style={styles.photoAndNameContainer}>
        {account.picture ? <AccountPhoto photoUri={account.picture} /> : null}
        <ThemedText variant={'headingTwo'} style={styles.name}>
          {account.fullname_formatted}
        </ThemedText>
      </View>

      <ThemedText style={styles.warning}>{t('BCSC.Account.AccountInfo.Description')}</ThemedText>

      <AccountField
        label={t('BCSC.AccountDetails.AccountNickname')}
        value={nickname}
        onEdit={onEditNickname}
        editAccessibilityLabel={t('BCSC.Settings.EditNickname')}
        testID={testIdWithKey('NicknameField')}
      />
      <AccountField
        label={t('BCSC.Account.AccountInfo.AppExpiryDate')}
        value={expiryValue}
        testID={testIdWithKey('AppExpiryDateField')}
      />
      <AccountField
        label={t('BCSC.Account.AccountInfo.AccountType')}
        value={accountType}
        testID={testIdWithKey('AccountTypeField')}
      />
      <AccountField
        label={t('BCSC.Account.AccountInfo.Address')}
        value={account.address?.formatted ?? ''}
        onEdit={openAccountWebview}
        editAccessibilityLabel={t('BCSC.Account.AccountInfo.Address')}
        testID={testIdWithKey('AddressField')}
      />
      <AccountField
        label={t('BCSC.Account.AccountInfo.DateOfBirth')}
        value={account.birthdate ?? ''}
        testID={testIdWithKey('DateOfBirthField')}
      />
      <AccountField
        label={t('BCSC.Account.AccountInfo.EmailAddress')}
        value={account.email ?? ''}
        testID={testIdWithKey('EmailAddressField')}
      />
    </ScreenWrapper>
  )
}

export default AccountDetailsScreen
