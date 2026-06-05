import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Connection } from '@bifold/core'
import { NavigationContext } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler } from 'react-native'

import { createBifoldNavigationAdapter } from './BifoldNavigationAdapter'

type Props = StackScreenProps<BCSCMainStackParams, BCSCScreens.ConnectionLoading>

// Thin wrapper that delegates to Bifold's Connection screen. The adapter
// rewrites Bifold's hardcoded route names (Tab Home Stack / Tab Credential
// Stack / Tab Stack / Chat / Contacts Stack / Proof Requests Stack) to BCSC
// equivalents so we get Bifold's OOB → connection → proof / credentialOffer
// state machine without re-implementing it.
//
// Bifold deep-tree components (e.g. CredentialOfferAccept's "Done" button)
// call `useNavigation()` directly rather than reading the navigation prop.
// `NavigationContext.Provider` overrides what `useNavigation()` returns for
// the subtree, so those descendants also see our adapter.
const ConnectionLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation()
  const adaptedNavigation = useMemo(() => createBifoldNavigationAdapter(navigation, { t }), [navigation, t])
  const { credentialId, proofId } = route.params

  // Bifold's Connection screen blocks the Android hardware back button for its
  // entire lifetime (it assumes a locked QR handshake flow). Offers / proof
  // requests opened from a home notification show a header back button instead
  // (see MainStack), so honour the hardware button for them too: child effects
  // run before parent effects, so this handler registers after Bifold's blocker
  // and BackHandler gives it priority.
  useEffect(() => {
    if (!credentialId && !proofId) {
      return
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
      return true
    })
    return () => subscription.remove()
  }, [credentialId, proofId, navigation])
  const bifoldRoute = useMemo(
    () => ({
      ...route,
      params: {
        oobRecordId: route.params.oobRecordId,
        credentialId: route.params.credentialId,
        proofId: route.params.proofId,
      },
    }),
    [route]
  )

  return (
    <NavigationContext.Provider value={adaptedNavigation as any}>
      <Connection navigation={adaptedNavigation as any} route={bifoldRoute as any} />
    </NavigationContext.Provider>
  )
}

export default ConnectionLoadingScreen
