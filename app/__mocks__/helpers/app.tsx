import 'reflect-metadata'
import React, { PropsWithChildren, useMemo } from 'react'
import { container } from 'tsyringe'
import { MainContainer, ContainerProvider, ThemeProvider } from '@hyperledger/aries-bifold-core'

import { defaultTheme as theme } from '../../src/theme'

export const BasicAppContext: React.FC<PropsWithChildren> = ({ children }) => {
  const context = useMemo(() => new MainContainer(container.createChildContainer()).init(), [])
  return (
    <ContainerProvider value={context}>
      <ThemeProvider value={theme}>{children}</ThemeProvider>
    </ContainerProvider>
  )
}
