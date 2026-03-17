import React, { createContext, useContext } from 'react'
import { PairingService } from './PairingService'

const PairingServiceContext = createContext<PairingService | null>(null)

export const PairingServiceProvider: React.FC<{
  service: PairingService
  children: React.ReactNode
}> = ({ service, children }) => {
  return <PairingServiceContext.Provider value={service}>{children}</PairingServiceContext.Provider>
}

export const usePairingService = () => {
  const context = useContext(PairingServiceContext)
  if (!context) {
    throw new Error('usePairingService must be used within a PairingServiceProvider')
  }

  return context
}
