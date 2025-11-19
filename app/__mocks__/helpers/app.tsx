import { ContainerProvider, MainContainer, MockLogger, StoreProvider, ThemeProvider, TOKENS } from '@bifold/core'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { BCThemeNames } from '@/constants'
import { initialState, reducer } from '@/store'
import { themes } from '@/theme'

export const BasicAppContext: React.FC<PropsWithChildren> = ({ children }) => {
  const context = useMemo(() => {
    const childContainer = container.createChildContainer()
    childContainer.registerInstance(TOKENS.UTIL_LOGGER, new MockLogger())
    const c = new MainContainer(childContainer).init()
    return c
  }, [])

  return (
    <ContainerProvider value={context}>
      <StoreProvider initialState={initialState} reducer={reducer}>
        <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.BCWallet}>
          {children}
        </ThemeProvider>
      </StoreProvider>
    </ContainerProvider>
  )
}
