import { BCSCIdTokenContext } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCStackProvider } from '@/bcsc-theme/contexts/BCSCStackContext'
import {
  resetBCSCStore,
  seedBCSCStore,
  seedBCSCStoreFromBCState,
  type BCSCStoreSeed,
} from '@/bcsc-theme/storage/testing'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { BCThemeNames } from '@/constants'
import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { RemoteConfigProvider } from '@/remote-config/RemoteConfig'
import { getBundledRemoteConfig } from '@/remote-config/remote-config-utils'
import { BCState, initialState, reducer } from '@/store'
import { themes } from '@/theme'
import { ContainerProvider, MainContainer, MockLogger, StoreProvider, ThemeProvider, TOKENS } from '@bifold/core'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import 'reflect-metadata'
import { container } from 'tsyringe'

interface BasicAppContextProps extends PropsWithChildren {
  initialStateOverride?: Partial<BCState>
  // Fields for the BCSC store; it's reset to its initial state first, so tests don't leak into each other
  bcscState?: BCSCStoreSeed
  idTokenOverride?: Partial<IdToken> | null // Defaults to no id token (device limit unknown)
}

export const BasicAppContext: React.FC<BasicAppContextProps> = ({
  children,
  initialStateOverride,
  bcscState,
  idTokenOverride = null,
}) => {
  useMemo(() => {
    resetBCSCStore()
    // Fields that already live in the BCSC store also take their values from initialStateOverride, so tests
    // written against Bifold's state keep working while callers move over
    seedBCSCStoreFromBCState((initialStateOverride ?? {}) as never, { reset: false })
    if (bcscState) {
      seedBCSCStore(bcscState)
    }
  }, [bcscState, initialStateOverride])

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

  const idTokenContextValue = useMemo(
    () => ({ isLoading: false, data: idTokenOverride as IdToken | null, refreshData: () => {} }),
    [idTokenOverride]
  )

  return (
    <ContainerProvider value={context}>
      <StoreProvider initialState={testInitialState} reducer={reducer}>
        <RemoteConfigProvider logger={new MockLogger() as any} initialConfig={getBundledRemoteConfig()}>
          <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.BCWallet}>
            <BCSCIdTokenContext.Provider value={idTokenContextValue}>
              <BCSCStackProvider>
                <ErrorAlertProvider>{children}</ErrorAlertProvider>
              </BCSCStackProvider>
            </BCSCIdTokenContext.Provider>
          </ThemeProvider>
        </RemoteConfigProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}
