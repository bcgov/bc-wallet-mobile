import { BCSCStackProvider } from '@/bcsc-theme/contexts/BCSCStackContext'
import { BCThemeNames } from '@/constants'
import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { RemoteConfigProvider } from '@/remote-config/RemoteConfig'
import { BCState, initialState, reducer } from '@/store'
import { themes } from '@/theme'
import { ContainerProvider, MainContainer, MockLogger, StoreProvider, ThemeProvider, TOKENS } from '@bifold/core'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import 'reflect-metadata'
import { container } from 'tsyringe'

// RemoteConfigProvider's real init effect awaits PersistentStorage, then a real axios.get() to a
// URL that's unset under Jest (react-native-config has no test mock here), so it always resolves
// asynchronously after the test's initial render — outside any act() the many test files using
// BasicAppContext wrap it in, which is why "not wrapped in act(...)" warnings for it show up
// throughout the suite. This swaps in a synchronous stand-in, in the one shared place they all
// render through, so it never has pending work after mount — no act() warning, no doomed network
// call per test — without touching RemoteConfig.tsx or any individual test file.
jest.mock('@/remote-config/RemoteConfig', () => {
  const ReactActual = jest.requireActual('react')
  const { getBundledRemoteConfig } = jest.requireActual('@/remote-config/remote-config-utils')

  let cache = getBundledRemoteConfig()
  const Context = ReactActual.createContext(null)

  const RemoteConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = ReactActual.useState(cache)

    const value = ReactActual.useMemo(
      () => ({
        getValue: (key: string) => state[key],
        setValue: (key: string, newValue: unknown) => {
          cache = { ...state, [key]: newValue }
          setState(cache)
        },
        refresh: async () => {},
        loading: false,
      }),
      [state]
    )

    return ReactActual.createElement(Context.Provider, { value }, children)
  }

  const useRemoteConfig = () => {
    const context = ReactActual.useContext(Context)
    if (!context) {
      throw new Error('useRemoteConfig must be used within a RemoteConfigProvider')
    }
    return context
  }

  const getRemoteConfig = () => cache

  return { __esModule: true, RemoteConfigProvider, useRemoteConfig, getRemoteConfig }
})

interface BasicAppContextProps extends PropsWithChildren {
  initialStateOverride?: Partial<BCState>
}

export const BasicAppContext: React.FC<BasicAppContextProps> = ({ children, initialStateOverride }) => {
  const context = useMemo(() => {
    const childContainer = container.createChildContainer()
    childContainer.registerInstance(TOKENS.UTIL_LOGGER, new MockLogger())
    const c = new MainContainer(childContainer).init()

    return c
  }, [])

  const testInitialState = useMemo(
    () => ({
      ...initialState,
      ...initialStateOverride,
      bcsc: {
        ...initialState.bcsc,
        ...initialStateOverride?.bcsc,
      },
      developer: {
        ...initialState.developer,
        ...initialStateOverride?.developer,
      },
    }),
    [initialStateOverride]
  )

  return (
    <ContainerProvider value={context}>
      <StoreProvider initialState={testInitialState} reducer={reducer}>
        <RemoteConfigProvider logger={new MockLogger() as any}>
          <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.BCWallet}>
            <BCSCStackProvider>
              <ErrorAlertProvider>{children}</ErrorAlertProvider>
            </BCSCStackProvider>
          </ThemeProvider>
        </RemoteConfigProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}
