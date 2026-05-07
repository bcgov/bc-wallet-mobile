import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { CommonActions, NavigationProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'

import type { TFunction } from 'i18next'

/**
 * Bifold's CredentialOffer and ProofRequest screens, when reused inside a BCSC
 * stack, navigate to route names BCSC does not register (Tab Home Stack, Contacts
 * Stack/JSON Details, Proof Requests Stack/Choose a credential). The adapter
 * intercepts those names and routes to BCSC equivalents — or surfaces a toast
 * for surfaces deferred to a later release. Everything else passes through
 * untouched, including getParent (which returns its own adapter so chained
 * calls continue to be translated).
 */

const BIFOLD_TAB_HOME_STACK = 'Tab Home Stack'
const BIFOLD_CONTACTS_STACK = 'Contacts Stack'
const BIFOLD_PROOF_REQUESTS_STACK = 'Proof Requests Stack'

export interface AdapterOptions {
  t: TFunction
}

export const createBifoldNavigationAdapter = <T extends NavigationProp<any>>(
  navigation: T,
  options: AdapterOptions
): T => {
  const { t } = options

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === 'navigate') {
        return (name: string, params?: unknown) => {
          if (name === BIFOLD_TAB_HOME_STACK) {
            target.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
              })
            )
            return
          }
          if (name === BIFOLD_CONTACTS_STACK || name === BIFOLD_PROOF_REQUESTS_STACK) {
            Toast.show({ type: 'info', text1: t('BCSC.Scan.FeatureUnavailable') })
            return
          }
          return (target as any).navigate(name, params)
        }
      }
      if (prop === 'getParent') {
        return () => {
          const parent = (target as any).getParent?.()
          return parent ? createBifoldNavigationAdapter(parent, options) : undefined
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }

  return new Proxy(navigation, handler)
}
