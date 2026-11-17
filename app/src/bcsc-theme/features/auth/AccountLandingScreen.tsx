import BCSCLogo from '@/assets/img/BCSCLogo.svg'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import { useAuthentication } from '@/bcsc-theme/hooks/useAuthentication'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountLandingScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AccountLanding>
}

const AccountLandingScreen = ({ navigation }: AccountLandingScreenProps) => {
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const authentication = useAuthentication(navigation)

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
  })

  const handleAccountSelect = useCallback(async () => {
    await authentication.unlockApp()
  }, [authentication])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        accessibilityLabel={t('BCSC.AccountLanding.Unlock')}
        title={t('BCSC.AccountLanding.Unlock')}
        onPress={handleAccountSelect}
        testID={testIdWithKey(TestIds.auth.accountLanding.unlock)}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} scrollable scrollViewContainerStyle={styles.contentContainer} controls={controls}>
      {/* Banners scroll with the page rather than pinning above it, so they cannot crowd out the content
          at large OS font sizes. noop handler: DEVICE_LIMIT_EXCEEDED is the only banner that invokes it
          and is filtered out below. */}
      <NotificationBannerContainer
        onManageDevices={() => {}}
        bannerMessages={store.bcsc.bannerMessages.filter((b) => b.id !== BCSCBanner.DEVICE_LIMIT_EXCEEDED)}
      />
      <View style={styles.content}>
        <BCSCLogo width={160} height={160} />
        <ThemedText variant={'headingFour'} style={{ color: ColorPalette.brand.primary }}>
          {t('BCSC.AccountLanding.Title')}
        </ThemedText>
        <ThemedText variant={'normal'} style={{ textAlign: 'center', paddingTop: Spacing.xxl }}>
          {t('BCSC.AccountLanding.Description')}
        </ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default AccountLandingScreen
