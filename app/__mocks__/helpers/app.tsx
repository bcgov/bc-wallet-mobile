import { ContainerProvider, MainContainer, StoreProvider, ThemeProvider } from '@bifold/core'
import * as React from 'react'
import { PropsWithChildren, useMemo } from 'react'
import 'reflect-metadata'
import { container } from 'tsyringe'

import { BCThemeNames } from '@/constants'
import { initialState, reducer } from '@/store'
import { themes } from '@/theme'

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
