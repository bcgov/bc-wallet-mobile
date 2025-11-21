import { GENERIC_CARD_SIZE_SMALL } from '@/bcsc-theme/components/GenericCardImage'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
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
  const account = useAccount()

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

  return (
    <TabScreenWrapper>
      <NotificationBannerContainer onManageDevices={handleManageDevices} />
      <HomeHeader name={account.fullname_formatted} cardSize={GENERIC_CARD_SIZE_SMALL} />
      <View style={styles.buttonsContainer}>
        <SectionButton
          title={t('BCSC.Home.WhereToUseTitle')}
          description={t('BCSC.Home.WhereToUseDescription')}
          style={{ marginBottom: Spacing.md }}
          onPress={handleWhereToUsePress}
        />
        <SectionButton
          title={t('BCSC.Home.LogInFromComputerTitle')}
          description={t('BCSC.Home.LogInFromComputerDescription')}
          onPress={handlePairingCodePress}
        />
      </View>
      <SavedServices />
    </TabScreenWrapper>
  )
}

export default Home
