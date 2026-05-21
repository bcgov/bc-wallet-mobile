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
 *
 * Proof-request exit paths (Bifold's `ProofRequest` rendered inline by
 * `Connection.tsx`) all funnel through these same intercepts: decline,
 * cancel-done, the `Declined`/`Abandoned` state effect, and the share-success
 * "Back to Home" button inside `ProofRequestAccept` all call
 * `navigation.getParent()?.navigate('Tab Home Stack', { screen: 'Home' })`,
 * which the navigate intercept resets onto `BCSCStacks.Tab` / `Home`.
 * `ProofRequestAccept` reads `navigation` via `useNavigation()` rather than a
 * prop, so the `NavigationContext.Provider` wrapping in `ConnectionLoadingScreen`
 * (not just the prop-level adapter) is what makes its calls reach this code.
 *
 * Chat path: bifold's Connection.tsx dispatches a reset to `[TabStack, Chat]`
 * (or, less commonly, calls `navigate('Chat', { connectionId })`) when an OOB
 * exchange completes with no goal code. BCSC now has its own chat surface
 * (`BCSCScreens.ContactChat`), so the adapter routes that connectionId into
 * ContactChat instead of falling back to Home.
 */

// Bifold route names that don't exist in BCSC's nav graph.
const BIFOLD_TAB_HOME_STACK = 'Tab Home Stack' // Bifold's TabStacks.HomeStack
const BIFOLD_TAB_CREDENTIAL_STACK = 'Tab Credential Stack' // Bifold's TabStacks.CredentialStack
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

// Reset to BCSC's tab navigator with the Wallet tab focused — BCSC's equivalent
// of Bifold's TabStacks.CredentialStack target (used by CredentialOfferAccept's
// "Done" button to send the user to where their credentials live).
const resetToBCSCWallet = (navigation: NavigationProp<any>): void => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Wallet }] } }],
    })
  )
}

// Reset to BCSC's tab navigator with Home focused, then push ContactChat on top
// (index 1). The Tab/Home route on the stack means the back button on chat goes
// back to Home — the natural place to land after a chat session.
const resetToBCSCContactChat = (navigation: NavigationProp<any>, connectionId: string): void => {
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        { name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } },
        { name: BCSCScreens.ContactChat, params: { connectionId } },
      ],
    })
  )
}

// Detect Bifold's `reset({ … TabStack … Chat … })` action, dispatched by
// Connection.tsx on the enableChat=true completion path. The reset routes
// reference Bifold's nav graph, which BCSC doesn't register; if the Chat route
// carries a connectionId we have somewhere meaningful to land — otherwise fall
// back to Home so the user still ends up somewhere valid.
//
// Heuristic note: the match is intentionally broad — any RESET whose routes
// contain `Tab Stack` OR `Chat` is treated as the Bifold chat-path reset.
// BCSC has no screen named `Chat` and uses `BCSCStacks.Tab` (not `Tab Stack`),
// so collisions with legitimate BCSC resets are unlikely today. Revisit if a
// future Bifold internal refactor changes the reset shape.
type BifoldResetRoute = { name?: string; params?: { connectionId?: string } }
const detectBifoldChatReset = (action: {
  type?: string
  payload?: { routes?: BifoldResetRoute[] }
}): { matched: boolean; connectionId?: string } => {
  if (action.type !== 'RESET') {
    return { matched: false }
  }
  const routes = action.payload?.routes ?? []
  const matched = routes.some((r) => r.name === BIFOLD_TAB_STACK || r.name === BIFOLD_CHAT)
  if (!matched) {
    return { matched: false }
  }
  const chatRoute = routes.find((r) => r.name === BIFOLD_CHAT)
  return { matched: true, connectionId: chatRoute?.params?.connectionId }
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
          if (name === BIFOLD_TAB_CREDENTIAL_STACK) {
            resetToBCSCWallet(target)
            return
          }
          if (name === BIFOLD_CHAT) {
            const connectionId = (params as { connectionId?: string } | undefined)?.connectionId
            if (connectionId) {
              target.navigate(BCSCScreens.ContactChat, { connectionId })
              return
            }
            // Fall back to a toast if a caller ever invokes Chat without a
            // connectionId — we have nothing to display without one.
            Toast.show({ type: 'info', text1: t('BCSC.Scan.FeatureUnavailable') })
            return
          }
          if (name === BIFOLD_CONTACTS_STACK || name === BIFOLD_PROOF_REQUESTS_STACK) {
            Toast.show({ type: 'info', text1: t('BCSC.Scan.FeatureUnavailable') })
            return
          }
          return target.navigate(name, params)
        }
      }
      if (prop === 'dispatch') {
        return (action: any) => {
          const chatReset = detectBifoldChatReset(action)
          if (chatReset.matched) {
            if (chatReset.connectionId) {
              resetToBCSCContactChat(target, chatReset.connectionId)
            } else {
              resetToBCSCHome(target)
            }
            return
          }
          return target.dispatch(action)
        }
      }
      if (prop === 'getParent') {
        return () => {
          const parent = target.getParent?.()
          // Bifold's screens call `navigation.getParent()?.navigate('Tab Home Stack' / 'Tab Credential Stack' / …)`
          // expecting a parent navigator to translate those route names. BCSC's MainStack is the root
          // authenticated navigator, so the underlying `getParent()` returns undefined and the
          // optional chain short-circuits — the route-name intercept never fires.
          //
          // Fall back to wrapping `target` itself so the intercept runs. The intercept handlers
          // dispatch resets onto `target` (which IS MainStack here), so resetting to BCSCStacks.Tab
          // works fine — MainStack registers it.
          return createBifoldNavigationAdapter((parent ?? target) as any, options)
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  }

  return new Proxy(navigation, handler)
}
