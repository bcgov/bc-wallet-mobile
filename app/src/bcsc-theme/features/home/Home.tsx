import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
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
import SavedServices from './components/SavedServices'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const apiClient = useBCSCApiClient()
  const { account } = useAccount()
  const [store] = useStore<BCState>()

  const handleManageDevices = useCallback(() => {
    navigation.getParent()?.navigate(BCSCScreens.MainWebView, {
      url: apiClient.endpoints.accountDevices,
      title: t('BCSC.Screens.ManageDevices'),
    })
  }, [apiClient.endpoints.accountDevices, navigation, t])

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

  const filteredBannerMessages = store.bcsc.bannerMessages.filter((b) => b.id === BCSCBanner.ACCOUNT_EXPIRING_SOON)

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
          {filteredBannerMessages.length > 0 && (
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
