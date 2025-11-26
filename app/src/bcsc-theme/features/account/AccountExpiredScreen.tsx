import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { AppBannerSection, BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import HomeHeader from '../home/components/HomeHeader'

interface AccountExpiredScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountExpired>
}

/**
 * Renders the Account Expired screen, informing users that their account has expired and providing options to renew or remove the account.
 *
 * @returns {*} {JSX.Element} The AccountExpiredScreen component.
 */
export const AccountExpiredScreen = ({ navigation }: AccountExpiredScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const factoryReset = useFactoryReset()
  const account = useAccount()

  const styles = StyleSheet.create({
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
    actionsContainer: {
      gap: Spacing.md,
    },
  })

  return (
    <ScreenWrapper padded={false} scrollable={false}>
      <AppBannerSection
        id={BCSCBanner.ACCOUNT_EXPIRED}
        title={t('BCSC.AccountExpired.StaticBannerTitle')}
        dismissible={false}
        description={t('BCSC.AccountExpired.StaticBannerDescription', {
          accountExpiration: account.card_expiry,
        })}
        type="warning"
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HomeHeader name={account.fullname_formatted} fontSize={20} cardSize={GENERIC_CARD_SIZE_SMALL} />

        <View style={styles.actionsContainer}>
          <CardButton
            title={t('BCSC.AccountExpired.RenewButton')}
            onPress={() => {
              navigation.navigate(BCSCScreens.AccountRenewalInformation)
            }}
          />
          <CardButton
            title={t('BCSC.AccountExpired.RemoveButton')}
            onPress={async () => {
              await factoryReset({
                completedNewSetup: true,
                completedOnboarding: true,
              })
            }}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}
