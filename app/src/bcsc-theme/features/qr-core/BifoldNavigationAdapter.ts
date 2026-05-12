import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { CommonActions, NavigationProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'

import type { TFunction } from 'i18next'

/**
 * Bifold's Connection / CredentialOffer / ProofRequest screens, when reused
 * inside a BCSC stack, navigate to route names BCSC does not register —
 * Bifold's `Tab Home Stack`, `Tab Stack` (root), `Chat`, plus contact/proof
 * surfaces. The adapter intercepts those names and routes to BCSC equivalents
 * — or surfaces a toast for features deferred to a later release. Everything
 * else passes through untouched, including getParent (which returns its own
 * adapter so chained calls continue to be translated) and dispatch (which we
 * also intercept to catch reset actions that target Bifold's nav graph).
 */

// Bifold route names that don't exist in BCSC's nav graph.
const BIFOLD_TAB_HOME_STACK = 'Tab Home Stack' // Bifold's TabStacks.HomeStack
const BIFOLD_TAB_STACK = 'Tab Stack' // Bifold's Stacks.TabStack (root)
const BIFOLD_CHAT = 'Chat' // Bifold's Screens.Chat — BCSC has no chat surface
const BIFOLD_CONTACTS_STACK = 'Contacts Stack'
const BIFOLD_PROOF_REQUESTS_STACK = 'Proof Requests Stack'

export interface AdapterOptions {
  t: TFunction
}

// Reset to BCSC's tab navigator with Home focused — the BCSC equivalent of
// Bifold's "return to home" terminal state in Connection.tsx.
const resetToBCSCHome = (navigation: NavigationProp<any>): void => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
    })
  )
}

// Detect Bifold's `reset({ … TabStack … Chat … })` action, dispatched by
// Connection.tsx on the enableChat=true completion path. The reset routes
// reference Bifold's nav graph, which BCSC doesn't register; translate to
// BCSC's home reset so the chat path lands somewhere valid.
//
// Heuristic note: the match is intentionally broad — any RESET whose routes
// contain `Tab Stack` OR `Chat` is treated as the Bifold chat-path reset.
// BCSC has no screen named `Chat` and uses `BCSCStacks.Tab` (not `Tab Stack`),
// so collisions with legitimate BCSC resets are unlikely today. Revisit if a
// future Bifold internal refactor changes the reset shape.
const isBifoldChatResetAction = (action: { type?: string; payload?: { routes?: { name?: string }[] } }): boolean => {
  if (action.type !== 'RESET') {
    return false
  }
  const routes = action.payload?.routes ?? []
  return routes.some((r) => r.name === BIFOLD_TAB_STACK || r.name === BIFOLD_CHAT)
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
          if (name === BIFOLD_TAB_HOME_STACK || name === BIFOLD_TAB_STACK) {
            resetToBCSCHome(target)
            return
          }
          if (name === BIFOLD_CHAT) {
            // BCSC has no chat surface; treat as a soft no-op with a toast so
            // any caller that takes this path lands gracefully.
            Toast.show({ type: 'info', text1: t('BCSC.Scan.FeatureUnavailable') })
            return
          }
          if (name === BIFOLD_CONTACTS_STACK || name === BIFOLD_PROOF_REQUESTS_STACK) {
            Toast.show({ type: 'info', text1: t('BCSC.Scan.FeatureUnavailable') })
            return
          }
          return (target as any).navigate(name, params)
        }
      }
      if (prop === 'dispatch') {
        return (action: any) => {
          if (isBifoldChatResetAction(action)) {
            resetToBCSCHome(target)
            return
          }
          return (target as any).dispatch(action)
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
