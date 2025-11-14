import { AppBannerSection, BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import HomeHeader from '../home/components/HomeHeader'

interface AccountExpiredScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountExpired>
  route: {
    params: {
      accountName: string // "Brule, Steve"
      accountExpiration: string // UserInfoResponseData.card_expiry
    }
  }
}

/**
 * Renders the Account Expired screen, informing users that their account has expired and providing options to renew or remove the account.
 *
 * @returns {*} {JSX.Element} The AccountExpiredScreen component.
 */
export const AccountExpiredScreen = ({ navigation, route }: AccountExpiredScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const { accountName, accountExpiration } = route.params

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <AppBannerSection
        id={BCSCBanner.ACCOUNT_EXPIRED}
        title={t('BCSC.Account.ExpiredBannerTitle', { accountExpiration })}
        type="warning"
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HomeHeader name={accountName} fontSize={20} iconSize={72} />

        <CardButton
          title={'BCSC.AccountExpired.RenewButton'}
          onPress={() => {
            navigation.navigate(BCSCScreens.AccountRenewalInformation)
          }}
        />
        <CardButton
          title={'BCSC.AccountExpired.RemoveButton'}
          onPress={() => {
            // TODO (MD): Where should this go?
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
