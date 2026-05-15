import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { CommonActions } from '@react-navigation/native'
import Toast from 'react-native-toast-message'

import { createBifoldNavigationAdapter } from './BifoldNavigationAdapter'

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }))

const t = ((k: string) => k) as any

const mkNav = () => {
  const grandparent = { navigate: jest.fn(), dispatch: jest.fn(), getParent: jest.fn(() => undefined) }
  const parent = { navigate: jest.fn(), dispatch: jest.fn(), getParent: jest.fn(() => grandparent) }
  const nav = { navigate: jest.fn(), dispatch: jest.fn(), getParent: jest.fn(() => parent) }
  return { nav, parent, grandparent }
}

describe('BifoldNavigationAdapter', () => {
  beforeEach(() => jest.clearAllMocks())

  it('translates "Tab Home Stack" to a reset onto BCSC tab/home', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('Tab Home Stack' as never, { screen: 'Home' } as never)
    expect(nav.navigate).not.toHaveBeenCalled()
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
  })

  it('shows feature-unavailable toast for Contacts Stack and Proof Requests Stack', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('Contacts Stack' as never, { screen: 'JSON Details' } as never)
    adapted.navigate('Proof Requests Stack' as never, { screen: 'Choose a credential' } as never)
    expect(Toast.show).toHaveBeenCalledTimes(2)
    expect(Toast.show).toHaveBeenLastCalledWith({ type: 'info', text1: 'BCSC.Scan.FeatureUnavailable' })
    expect(nav.navigate).not.toHaveBeenCalled()
  })

  it('passes other routes straight through', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('SomeBcscRoute' as never, { x: 1 } as never)
    expect(nav.navigate).toHaveBeenCalledWith('SomeBcscRoute', { x: 1 })
  })

  it('wraps getParent so chained navigate calls are also translated', () => {
    const { nav, parent } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    const adaptedParent = adapted.getParent()
    adaptedParent?.navigate('Tab Home Stack' as never, undefined as never)
    expect(parent.dispatch).toHaveBeenCalled()
    expect(parent.navigate).not.toHaveBeenCalled()
  })

  it('falls back to wrapping the current target when no real parent exists (so route intercepts still fire)', () => {
    // Standalone nav has no parent; mimicking BCSCMainStack which is the root authenticated navigator.
    const orphan = { navigate: jest.fn(), dispatch: jest.fn(), getParent: jest.fn(() => undefined) }
    const adapted = createBifoldNavigationAdapter(orphan as any, { t })
    const fallbackParent = adapted.getParent()
    expect(fallbackParent).toBeDefined()
    // Calling navigate on the fallback parent with a Bifold route name still translates,
    // dispatching the BCSC reset on the same underlying nav.
    fallbackParent!.navigate('Tab Credential Stack' as never, undefined as never)
    expect(orphan.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Wallet }] } }],
      })
    )
  })

  it('translates "Tab Credential Stack" to a reset onto BCSC tab/wallet (CredentialOfferAccept Done button)', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('Tab Credential Stack' as never, { screen: 'Credentials' } as never)
    expect(nav.navigate).not.toHaveBeenCalled()
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Wallet }] } }],
      })
    )
  })

  it('translates "Tab Stack" navigate to a reset onto BCSC tab/home', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('Tab Stack' as never, undefined as never)
    expect(nav.navigate).not.toHaveBeenCalled()
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
  })

  it('shows feature-unavailable toast for navigate to Chat (BCSC has no chat surface)', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    adapted.navigate('Chat' as never, { connectionId: 'c-1' } as never)
    expect(Toast.show).toHaveBeenCalledWith({ type: 'info', text1: 'BCSC.Scan.FeatureUnavailable' })
    expect(nav.navigate).not.toHaveBeenCalled()
  })

  it('translates a Bifold chat-path reset dispatch to a BCSC home reset', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    // Mirrors the action Connection.tsx dispatches when enableChat=true completes.
    adapted.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: 'Tab Stack' }, { name: 'Chat', params: { connectionId: 'c-1' } }],
      })
    )
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
  })

  it('lets non-chat dispatch actions pass through unchanged', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    const action = CommonActions.goBack()
    adapted.dispatch(action)
    expect(nav.dispatch).toHaveBeenCalledWith(action)
  })

  it('does not translate a non-RESET dispatch action that happens to reference Bifold route names', () => {
    const { nav } = mkNav()
    const adapted = createBifoldNavigationAdapter(nav as any, { t })
    // A NAVIGATE action whose payload name is 'Chat' must still pass through —
    // the chat-reset intercept is gated on `action.type === 'RESET'`.
    const action = CommonActions.navigate('Chat')
    adapted.dispatch(action)
    expect(nav.dispatch).toHaveBeenCalledWith(action)
  })
})
