import BCSCLogo from '@/assets/img/BCSCLogo.svg'
import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { NotificationBannerContainer } from '@/bcsc-theme/components/NotificationBannerContainer'
import { useAuthentication } from '@/bcsc-theme/hooks/useAuthentication'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountLandingScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AccountLanding>
}

const AccountLandingScreen = ({ navigation }: AccountLandingScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const authentication = useAuthentication(navigation)

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    image: {
      marginTop: Spacing.xxl,
      alignItems: 'center',
    },
  })

  const handleAccountSelect = useCallback(async () => {
    const nickname = store.bcsc.nicknames?.[0]
    if (nickname) {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
    }
    await authentication.unlockApp()
  }, [authentication, dispatch, store.bcsc.nicknames])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        accessibilityLabel={t('BCSC.AccountLanding.Unlock')}
        title={t('BCSC.AccountLanding.Unlock')}
        onPress={handleAccountSelect}
        testID={testIdWithKey('Unlock')}
      />
    </ControlContainer>
  )

  return (
    <>
      {/* noop handler: DEVICE_LIMIT_EXCEEDED is the only banner that invokes it and is filtered out below */}
      <NotificationBannerContainer
        onManageDevices={() => {}}
        bannerMessages={store.bcsc.bannerMessages.filter((b) => b.id !== BCSCBanner.DEVICE_LIMIT_EXCEEDED)}
      />
      <ScreenWrapper padded={false} scrollable scrollViewContainerStyle={styles.contentContainer} controls={controls}>
        <View style={styles.image}>
          <BCSCLogo width={120} height={120} />
        </View>
        <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
          {t('BCSC.AccountSetup.Title')}
        </ThemedText>
      </ScreenWrapper>
    </>
  )
}

export default AccountLandingScreen
