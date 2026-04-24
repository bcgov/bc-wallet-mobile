import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { BCState } from '@/store'
import { getCredentialNotificationType } from '@/utils/credentials'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, View } from 'react-native'
import SectionButton from '../../components/SectionButton'
import HomeHeader from './components/HomeHeader'
import SavedServices from './components/SavedServices'

type HomeProps = StackScreenProps<BCSCTabStackParams, BCSCScreens.Home>

/**
 * Home screen for >= V4.1.x
 * @returns React element
 */
const Home: React.FC<HomeProps> = () => {
  const { Spacing } = useTheme()
  const notifications = useNotifications()
  const customNotifications = useCustomNotifications()

  return (
    <TabScreenWrapper scrollViewProps={{ contentContainerStyle: { padding: Spacing.lg } }}>
      <FlatList
        showsVerticalScrollIndicator={false}
        scrollEnabled={Boolean(notifications.length)}
        decelerationRate="fast"
        data={notifications}
        keyExtractor={(notification) => notification.id}
        renderItem={({ item }) => {
          const notificationType = getCredentialNotificationType(item)
          const customNotification = customNotifications.getCustomNotification(item.id)
          return (
            <ThemedText>{`Notification: ${item.id}, Type: ${notificationType} CustomNotification:${customNotification}`}</ThemedText>
            // <NotificationListItem
            //   notificationType={notificationType}
            //   notification={item}
            //   customNotification={customNotification}
            // />
          )
        }}
      />
    </TabScreenWrapper>
  )
}

/**
 * FIXME (V4.1): This screen will be needed somewhere in the release, uncertain where it will be used. Keeping as reference.
 */
export const HomeV4_0_x: React.FC<HomeProps> = ({ navigation }) => {
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
      <NotificationBannerContainer onManageDevices={handleManageDevices} />
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
