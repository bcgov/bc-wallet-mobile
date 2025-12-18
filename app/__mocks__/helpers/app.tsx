import { ContainerProvider, MainContainer, MockLogger, StoreProvider, ThemeProvider, TOKENS } from '@bifold/core'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { BCThemeNames } from '@/constants'
import { BCState, initialState, reducer } from '@/store'
import { themes } from '@/theme'

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
    }),
    [initialStateOverride],
  )

  return (
    <ContainerProvider value={context}>
      <StoreProvider initialState={testInitialState} reducer={reducer}>
        <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.BCWallet}>
          {children}
        </ThemeProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}
