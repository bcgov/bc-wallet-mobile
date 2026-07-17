import { CardButton } from '@/bcsc-theme/components/CardButton'
import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useCardStatus } from '@/bcsc-theme/hooks/useCardStatus'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { testIdWithKey, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import SectionButton from '../../components/SectionButton'
import HomeHeader from './components/HomeHeader'
import { NotificationsList } from './components/NotificationsList'
import PairingCodeCard from './components/PairingCodeCard'
import SavedServices from './components/SavedServices'
import WelcomeHeader from './components/WelcomeHeader'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

/**
 * Shared "manage devices" navigation handler for the Home screens: opens the account-devices
 * web view with the same route/params in both places, so the two can't drift apart.
 */
const useManageDevicesNavigation = (navigation: HomeProps['navigation']) => {
  const { t } = useTranslation()
  const apiClient = useBCSCApiClient()

  return useCallback(() => {
    navigation.getParent()?.navigate(BCSCScreens.MainWebView, {
      url: apiClient.endpoints.accountDevices,
      title: t('BCSC.Screens.ManageDevices'),
    })
  }, [apiClient.endpoints.accountDevices, navigation, t])
}

/**
 * Home screen for >= V4.1.x
 * @returns React element
 */
const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { account } = useAccount()
  const { isActivelyVerified } = useCardStatus()
  const handleManageDevices = useManageDevicesNavigation(navigation)

  const handlePairingCodePress = () => {
    navigation.getParent()?.navigate(BCSCScreens.ManualPairingCode)
  }

  return (
    <>
      <NotificationBannerContainer onManageDevices={handleManageDevices} bannerMessages={store.bcsc.bannerMessages} />
      <TabScreenWrapper scrollViewProps={{ contentContainerStyle: { padding: Spacing.lg, gap: Spacing.lg } }}>
        {/* Header and pairing shortcut are only shown to actively-verified users, since the pairing
            code screen itself is gated on verification (see QRCoreStack) and unusable otherwise. */}
        {isActivelyVerified && account ? <WelcomeHeader name={account.fullname_formatted} /> : null}
        {isActivelyVerified ? (
          <PairingCodeCard
            title={t('BCSC.Home.LogInFromComputerTitle')}
            description={t('BCSC.Home.LogInFromComputerDescription')}
            onPress={handlePairingCodePress}
            accessibilityHint={a11yLabel(t('BCSC.Home.LogInFromComputerDescription'))}
            testID={testIdWithKey('LogInFromComputer')}
          />
        ) : null}
        <NotificationsList />
      </TabScreenWrapper>
    </>
  )
}

/**
 * FIXME (V4.1): This screen will be needed somewhere in the release, uncertain where it will be used. Keeping as reference.
 */
export const HomeV4_0_x: React.FC<HomeProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { account } = useAccount()
  const [store] = useStore<BCState>()
  const handleManageDevices = useManageDevicesNavigation(navigation)

  const styles = StyleSheet.create({
    buttonsContainer: {
      padding: Spacing.md,
    },
  })

  const handleWhereToUsePress = () => {
    navigation.navigate(BCSCScreens.Services)
  }

  const handlePairingCodePress = () => {
    navigation.getParent()?.navigate(BCSCScreens.ManualPairingCode)
  }

  if (!account) {
    return <LoadingScreen />
  }

  return (
    <>
      <NotificationBannerContainer onManageDevices={handleManageDevices} bannerMessages={store.bcsc.bannerMessages} />
      <TabScreenWrapper>
        <HomeHeader name={account.fullname_formatted} cardSize={GENERIC_CARD_SIZE_SMALL} />
        <View style={styles.buttonsContainer}>
          <SectionButton
            title={t('BCSC.Home.WhereToUseTitle')}
            accessibilityLabel={a11yLabel(t('BCSC.Home.WhereToUseAccessibilityLabel'))}
            description={t('BCSC.Home.WhereToUseDescription')}
            style={{ marginBottom: Spacing.md }}
            onPress={handleWhereToUsePress}
            testID={testIdWithKey('WhereToUse')}
          />
          <SectionButton
            title={t('BCSC.Home.LogInFromComputerTitle')}
            accessibilityLabel={a11yLabel(t('BCSC.Home.LogInFromComputerAccessibilityLabel'))}
            description={t('BCSC.Home.LogInFromComputerDescription')}
            onPress={handlePairingCodePress}
            testID={testIdWithKey('LogInFromComputer')}
          />
          {store.bcsc.bannerMessages.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <CardButton
                title={t('BCSC.AccountRenewal.WarningRenewButton')}
                onPress={() => navigation.getParent()?.navigate(BCSCScreens.AccountRenewalInformation)}
              />
            </View>
          )}
        </View>
        <SavedServices />
      </TabScreenWrapper>
    </>
  )
}

export default Home
