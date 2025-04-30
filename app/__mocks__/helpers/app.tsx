import 'reflect-metadata'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import { container } from 'tsyringe'
import { MainContainer, ContainerProvider, ThemeProvider, StoreProvider } from '@bifold/core'

import { themes } from '@/theme'
import { BCThemeNames } from '@/constants'
import { initialState, reducer } from '@/store'

export const BasicAppContext: React.FC<PropsWithChildren> = ({ children }) => {
  const context = useMemo(() => new MainContainer(container.createChildContainer()).init(), [])
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
