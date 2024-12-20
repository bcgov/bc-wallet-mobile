import 'reflect-metadata'
import React, { PropsWithChildren, useMemo } from 'react'

import { container } from 'tsyringe'
import { MainContainer, ContainerProvider } from '@hyperledger/aries-bifold-core'

export const BasicAppContext: React.FC<PropsWithChildren> = ({ children }) => {
  const context = useMemo(() => new MainContainer(container.createChildContainer()).init(), [])
  return (
    <ContainerProvider value={context}>{children}</ContainerProvider>
  )
}