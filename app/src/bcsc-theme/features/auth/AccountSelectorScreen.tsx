import { AppBanner, BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { useAuthentication } from '@/bcsc-theme/hooks/useAuthentication'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { openLink } from '@/utils/links'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, TOKENS, testIdWithKey, ThemedText, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountSelectorScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AccountSelector>
}

const SERVER_BANNER_IDS = new Set<BCSCBanner>([BCSCBanner.IAS_SERVER_UNAVAILABLE, BCSCBanner.IAS_SERVER_NOTIFICATION])

const AccountSelectorScreen = ({ navigation }: AccountSelectorScreenProps) => {
  const [store, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const authentication = useAuthentication(navigation)

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })

  const handleAccountSelect = useCallback(
    async (nickname: string) => {
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
      await authentication.unlockApp()
    },
    [authentication, dispatch]
  )

  const handleBannerPress = useCallback(
    async (contactLink?: string) => {
      if (typeof contactLink === 'string') {
        try {
          await openLink(contactLink)
        } catch (error) {
          logger.error('Failed to open URL from banner:', error as Error)
        }
      }
    },
    [logger]
  )

  const serverBanners = store.bcsc.bannerMessages
    .filter((banner) => SERVER_BANNER_IDS.has(banner.id))
    .map((banner) => ({
      id: banner.id,
      title: banner.title,
      description: banner.description,
      type: banner.type,
      dismissible: banner.dismissible,
      onPress: () => handleBannerPress(banner.metadata?.contactLink as string | undefined),
    }))

  // This handles the case where user has completed onboarding but has not set a nickname yet
  const controls = store.bcsc.nicknames.length ? (
    <>
      <ThemedText variant={'headingFour'}>{t('BCSC.AccountSetup.ContinueAs')}</ThemedText>
      <View style={{ gap: Spacing.sm }}>
        {Array.from(store.bcsc.nicknames).map((nickname) => (
          <CardButton key={nickname} title={nickname} onPress={() => handleAccountSelect(nickname)} />
        ))}
      </View>
    </>
  ) : (
    <Button
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('ContinueSetup')}
      title={'Continue setting up account'}
      accessibilityLabel={'Continue setting up account'}
      onPress={authentication.unlockApp}
    />
  )

  return (
    <>
      <AppBanner messages={serverBanners} />
      <ScreenWrapper scrollable scrollViewContainerStyle={styles.contentContainer} controls={controls}>
        <GenericCardImage />
        <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
          {t('BCSC.AccountSetup.Title')}
        </ThemedText>
      </ScreenWrapper>
    </>
  )
}

export default AccountSelectorScreen
