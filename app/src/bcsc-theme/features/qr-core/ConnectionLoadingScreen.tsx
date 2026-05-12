import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Connection } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { createBifoldNavigationAdapter } from './BifoldNavigationAdapter'

type Props = StackScreenProps<BCSCMainStackParams, BCSCScreens.ConnectionLoading>

// Thin wrapper that delegates to Bifold's Connection screen. The adapter
// rewrites Bifold's hardcoded route names (Tab Home Stack / Tab Stack / Chat
// / Contacts Stack / Proof Requests Stack) to BCSC equivalents, so we get
// Bifold's OOB → connection → proof / credentialOffer state machine without
// re-implementing it.
const ConnectionLoadingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation()
  const adaptedNavigation = useMemo(() => createBifoldNavigationAdapter(navigation, { t }), [navigation, t])
  const bifoldRoute = useMemo(() => ({ ...route, params: { oobRecordId: route.params.oobRecordId } }), [route])

  return <Connection navigation={adaptedNavigation as any} route={bifoldRoute as any} />
}

export default ConnectionLoadingScreen
