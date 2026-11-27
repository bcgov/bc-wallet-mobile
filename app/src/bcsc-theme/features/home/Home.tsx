import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useFloatingScanButtonClearance } from '@/bcsc-theme/features/scan'
import { BannersScope } from '@/bcsc-theme/hooks/useBanners'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useCardStatus } from '@/bcsc-theme/hooks/useCardStatus'
import { BCSCQRCoreScreens, BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { NotificationsList } from './components/NotificationsList'
import PairingCodeCard from './components/PairingCodeCard'
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

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { account } = useAccount()
  const { isActivelyVerified } = useCardStatus()
  const handleManageDevices = useManageDevicesNavigation(navigation)
  const scanButtonClearance = useFloatingScanButtonClearance()

  const handlePairingCodePress = () => {
    navigation.getParent()?.navigate(BCSCScreens.QRCore, { screen: BCSCQRCoreScreens.PairingCode })
  }

  return (
    <TabScreenWrapper>
      {/* Banners scroll with the page: pinned above the ScrollView, a couple of them fill the screen at
          large OS font sizes and leave no room for the content. */}
      <NotificationBannerContainer scope={BannersScope.Home} onManageDevices={handleManageDevices} />
      {/* The Scan button floats over the bottom of the page (see TabStack): keep its footprint free
          below the last card so the card can scroll out from under it. */}
      <View style={{ padding: Spacing.lg, paddingBottom: Spacing.lg + scanButtonClearance, gap: Spacing.lg }}>
        {/* Header and pairing shortcut are only shown to actively-verified users, since the pairing
            code screen itself is gated on verification (see QRCoreStack) and unusable otherwise. */}
        {isActivelyVerified && account ? <WelcomeHeader name={account.fullname_formatted} /> : null}
        {isActivelyVerified ? (
          <PairingCodeCard
            title={t('BCSC.Home.LogInFromComputerTitle')}
            description={t('BCSC.Home.LogInFromComputerDescription')}
            onPress={handlePairingCodePress}
            accessibilityHint={a11yLabel(t('BCSC.Home.LogInFromComputerDescription'))}
            testID={testIdWithKey(TestIds.main.pairing.logInFromComputer)}
          />
        ) : null}
        <NotificationsList />
      </View>
    </TabScreenWrapper>
  )
}

export default Home
