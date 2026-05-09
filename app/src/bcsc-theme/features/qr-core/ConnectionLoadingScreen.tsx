import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import {
  CredentialOffer,
  LoadingPlaceholder,
  LoadingPlaceholderWorkflowType,
  ProofRequest,
  testIdWithKey,
  ToastType,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet, View } from 'react-native'
import Toast from 'react-native-toast-message'

import { createBifoldNavigationAdapter } from './BifoldNavigationAdapter'
import useConnectionLoadingViewModel from './useConnectionLoadingViewModel'

type Props = StackScreenProps<BCSCMainStackParams, BCSCScreens.ConnectionLoading>

const styles = StyleSheet.create({
  page: { flex: 1 },
})

const ConnectionLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation()
  const { oobRecordId } = route.params
  const state = useConnectionLoadingViewModel(oobRecordId)
  const adaptedNavigation = useMemo(() => createBifoldNavigationAdapter(navigation, { t }), [navigation, t])

  // Disable hardware back during the loading + proof/cred screens — matches Bifold Connection.tsx.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (state.kind !== 'connection') {
      return
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
    Toast.show({ type: ToastType.Success, text1: t('Connection.ConnectionCompleted') })
  }, [state, navigation, t])

  switch (state.kind) {
    case 'loading':
    case 'connection':
      return (
        <View style={styles.page}>
          <LoadingPlaceholder
            workflowType={LoadingPlaceholderWorkflowType.Connection}
            testID={testIdWithKey('ConnectionLoading')}
          />
        </View>
      )
    case 'proof':
      return (
        <View style={styles.page}>
          <ProofRequest navigation={adaptedNavigation as any} proofId={state.proofId} />
        </View>
      )
    case 'credentialOffer':
      return (
        <View style={styles.page}>
          <CredentialOffer navigation={adaptedNavigation as any} credentialId={state.credentialId} />
        </View>
      )
  }
}

export default ConnectionLoadingScreen
