import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { AppBannerSection, BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { ScreenWrapper, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import HomeHeader from '../home/components/HomeHeader'

interface AccountExpiredScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountExpired>
}

/**
 * Renders the Account Expired screen, informing users that their account has expired and providing options to renew or remove the account.
 *
 * @returns {*} {React.ReactElement} The AccountExpiredScreen component.
 */
export const AccountExpiredScreen = ({ navigation }: AccountExpiredScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const accountContext = useContext(BCSCAccountContext)
  const factoryReset = useFactoryReset()
  const { emitAlert } = useErrorAlert()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
    actionsContainer: {
      gap: Spacing.md,
    },
  })

  const handleRemoveAccount = useCallback(() => {
    emitAlert(t('Alerts.RemoveAccount.Title'), t('Alerts.RemoveAccount.Description'), {
      event: AppEventCode.REMOVE_ACCOUNT,
      actions: [
        {
          text: t('Global.Cancel'),
          style: 'cancel',
        },
        {
          text: t('Alerts.RemoveAccount.Action1'),
          style: 'destructive',
          onPress: async () => {
            try {
              loadingScreen.startLoading(t('BCSC.Account.RemoveAccountLoading'))

              logger.info('[RemoveAccount] User confirmed account removal, proceeding with verification reset')

              const result = await factoryReset()

              if (!result.success) {
                logger.error('[RemoveAccount] Failed to remove account', result.error)
              }
            } catch (error) {
              logger.error('[RemoveAccount] Error during account removal', error as Error)
            } finally {
              loadingScreen.stopLoading()
            }
          },
        },
      ],
    })
  }, [emitAlert, t, factoryReset, loadingScreen, logger])

  return (
    <ScreenWrapper padded={false} scrollable={false}>
      <AppBannerSection
        id={BCSCBanner.ACCOUNT_EXPIRED}
        title={t('BCSC.AccountExpired.StaticBannerTitle')}
        dismissible={false}
        description={t('BCSC.AccountExpired.StaticBannerDescription', {
          accountExpiration: accountContext?.account?.card_expiry,
        })}
        type="warning"
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HomeHeader
          name={accountContext?.account?.fullname_formatted || ''}
          fontSize={20}
          cardSize={GENERIC_CARD_SIZE_SMALL}
        />

        <View style={styles.actionsContainer}>
          <CardButton
            title={t('BCSC.AccountExpired.RenewButton')}
            onPress={() => {
              navigation.navigate(BCSCScreens.AccountRenewalInformation)
            }}
          />
          <CardButton
            title={t('BCSC.AccountExpired.RemoveButton')}
            onPress={handleRemoveAccount}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}
