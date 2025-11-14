import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCScreens, BCSCTabStackParams } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import SectionButton from '../../components/SectionButton'
import HomeHeader from './components/HomeHeader'
import SavedServices from './components/SavedServices'

type HomeProps = {
  navigation: StackNavigationProp<BCSCTabStackParams, BCSCScreens.Home>
  route: {
    params: {
      accountName: string
    }
  }
}

const Home: React.FC<HomeProps> = ({ navigation, route }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const apiClient = useBCSCApiClient()

  const { accountName } = route.params

  const handleManageDevices = useCallback(() => {
    navigation.getParent()?.navigate(BCSCScreens.MainWebView, {
      url: `${apiClient.baseURL}/account/embedded/devices`,
      title: t('BCSC.Screens.ManageDevices'),
    })
  }, [apiClient.baseURL, navigation, t])

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
      <HomeHeader name={accountName} />
      <View style={styles.buttonsContainer}>
        <SectionButton
          title={t('Unified.Home.WhereToUseTitle')}
          description={t('Unified.Home.WhereToUseDescription')}
          style={{ marginBottom: Spacing.md }}
          onPress={handleWhereToUsePress}
        />
        <SectionButton
          title={t('Unified.Home.LogInFromComputerTitle')}
          description={t('Unified.Home.LogInFromComputerDescription')}
          onPress={handlePairingCodePress}
        />
      </View>
      <SavedServices />
    </TabScreenWrapper>
  )
}

export default Home
