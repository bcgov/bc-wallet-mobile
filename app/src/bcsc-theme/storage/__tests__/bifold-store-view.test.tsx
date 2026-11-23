import { Mode } from '@/constants'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { storage } from '..'
import { BifoldStoreView } from '../bifold-store-view'

let seen: { state: BCState; dispatch: ReturnType<typeof useStore<BCState>>[1] } | undefined

const Reader = () => {
  const [state, dispatch] = useStore<BCState>()
  seen = { state, dispatch }
  return <Text>{state.preferences.theme ?? 'default'}</Text>
}

const renderView = () =>
  render(
    <BifoldStoreView>
      <Reader />
    </BifoldStoreView>
  )

describe('BifoldStoreView', () => {
  it('gives Bifold readers the BCSC values in Bifold state shape', async () => {
    await storage.store.getState().preferences.setDeveloperMode(true)
    await storage.store.getState().developer.setTheme('dark')
    storage.store.getState().session.setDidAuthenticate(true)

    renderView()

    expect(seen?.state).toMatchObject({
      mode: Mode.BCSC,
      preferences: { theme: 'dark', developerModeEnabled: true },
      authentication: { didAuthenticate: true },
    })
  })

  it("keeps BC's own sections, which shared code reads", () => {
    renderView()
    expect(seen?.state.dismissPersonCredentialOffer).toBeDefined()
  })

  it('follows changes to the BCSC store', async () => {
    const tree = renderView()
    await act(async () => {
      await storage.store.getState().developer.setTheme('high-contrast')
    })
    expect(tree.getByText('high-contrast')).toBeTruthy()
  })

  it('ignores dispatches', () => {
    renderView()
    expect(() => seen?.dispatch({ type: 'preferences/developerMode' as never, payload: [true] })).not.toThrow()
    expect(storage.store.getState().preferences.developerModeEnabled).toBe(false)
  })
})
