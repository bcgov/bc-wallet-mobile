import { Connection } from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'

import ConnectionLoadingScreen from './ConnectionLoadingScreen'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@bifold/core', () => ({
  Connection: jest.fn().mockReturnValue(null),
}))
// `@react-navigation/native` isn't transformed by jest (see transformIgnorePatterns), so
// pull-through imports like NavigationContext come back as undefined. Spread the real module
// and supply a minimal NavigationContext shim — Provider just renders children — so the
// wrapping in ConnectionLoadingScreen works in tests.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContext: { Provider: ({ children }: any) => children },
}))

const ConnectionMock = Connection as jest.MockedFunction<typeof Connection>

const mkProps = () => {
  const navigation = { dispatch: jest.fn(), navigate: jest.fn(), getParent: jest.fn() } as any
  const route = { params: { oobRecordId: 'oob-1' } } as any
  return { navigation, route }
}

describe('ConnectionLoadingScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders Bifold's Connection screen with the oobRecordId from route params", () => {
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    expect(ConnectionMock).toHaveBeenCalled()
    const props = ConnectionMock.mock.calls.at(-1)![0] as any
    expect(props.route.params.oobRecordId).toBe('oob-1')
  })

  it('passes an adapted navigation prop (proxy, not the raw navigation)', () => {
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    const props = ConnectionMock.mock.calls.at(-1)![0] as any
    // The adapter is a Proxy — accessing `navigate` returns a function that intercepts
    // Bifold route names. Smoke-test by invoking with a Bifold-only route and confirming
    // it didn't pass through to the raw navigation.
    props.navigation.navigate('Tab Home Stack')
    expect(navigation.navigate).not.toHaveBeenCalled()
    expect(navigation.dispatch).toHaveBeenCalled()
  })
})
