import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Connection,
  CredentialProvisioningEventTypes,
  LoadingPlaceholder,
  LoadingPlaceholderWorkflowType,
  testIdWithKey,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { NavigationContext } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, DeviceEventEmitter, StyleSheet, View } from 'react-native'

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
  const [credentialProvisioningMonitor] = useServices([TOKENS.UTIL_CREDENTIAL_PROVISIONING_MONITOR])
  const { ColorPalette } = useTheme()

  // Bifold's Connection screen has no hold for auto credential provisioning
  // (only attestation), and Bifold's ProofRequest registers its provisioning
  // listeners too late to reliably catch Started — so the user briefly sees
  // "credential missing, can't proceed" while the wallet is fetching it in the
  // background. Gate here instead: this wrapper mounts at QR-scan time, well
  // before the proof arrives. Seeded from workflowInProgress because
  // DeviceEventEmitter has no replay and this screen can also mount after
  // Started fired (entry from a home notification). Remove once Bifold gates
  // Connection on CredentialProvisioningEventTypes.
  const [provisioningLoading, setProvisioningLoading] = useState<boolean>(
    () => credentialProvisioningMonitor?.workflowInProgress ?? false
  )

  useEffect(() => {
    if (!credentialProvisioningMonitor) {
      return
    }
    const handleStarted = () => setProvisioningLoading(true)
    const handleEnded = () => setProvisioningLoading(false)
    const subscriptions = [
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.Started, handleStarted),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.Completed, handleEnded),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedHandleProof, handleEnded),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedHandleOffer, handleEnded),
      DeviceEventEmitter.addListener(CredentialProvisioningEventTypes.FailedRequestCredential, handleEnded),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [credentialProvisioningMonitor])

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
      <View style={{ flex: 1 }}>
        <Connection navigation={adaptedNavigation as any} route={bifoldRoute as any} />
        {provisioningLoading && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: ColorPalette.brand.primaryBackground }]}>
            <LoadingPlaceholder
              workflowType={LoadingPlaceholderWorkflowType.ProofRequested}
              loadingProgressPercent={30}
              testID={testIdWithKey('ProvisioningLoading')}
            />
          </View>
        )}
      </View>
    </NavigationContext.Provider>
  )
}

export default ConnectionLoadingScreen
