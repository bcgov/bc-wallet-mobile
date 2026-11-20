import { Mode } from '@/constants'
import { BCState, initialState } from '@/store'
import { StoreContext } from '@bifold/core'
import React, { PropsWithChildren, useMemo } from 'react'
import { useStore } from 'zustand'
import { storage } from '.'
import { overlayBCSCState } from './state-view'

const ignoreDispatch = () => undefined

// Read-only view of the BCSC store in the shape Bifold's store had, mounted in place of Bifold's StoreProvider
// in the BCSC app (so ThemeProvider sits inside it). Its dispatches do nothing, and nothing is written.
// Readers: Bifold screens BCSC renders (theme, developer mode, contact names), shared app code that still reads
// BCState (Root's mode, useCrashReporting's stateLoaded, FeatureFlags' environment, the Developer screen).
// Built on BC's initial state, not Bifold's, so BC-only sections such as
// dismissPersonCredentialOffer exist for the shared code that reads them.
export const BifoldStoreView: React.FC<PropsWithChildren> = ({ children }) => {
  const state = useStore(storage.store)
  const value = useMemo(() => {
    const view = overlayBCSCState(initialState, state)
    const bifoldState: BCState = {
      ...view,
      mode: Mode.BCSC,
      preferences: { ...view.preferences, ...(state.developer.theme ? { theme: state.developer.theme } : {}) },
    }
    return [bifoldState, ignoreDispatch] as unknown as React.ContextType<typeof StoreContext>
  }, [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
