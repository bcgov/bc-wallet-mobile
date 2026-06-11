import React, { createContext, useContext } from 'react'

import { ConnectionInvitationService } from './ConnectionInvitationService'

const ConnectionInvitationServiceContext = createContext<ConnectionInvitationService | null>(null)

export const ConnectionInvitationServiceProvider: React.FC<{
  service: ConnectionInvitationService
  children: React.ReactNode
}> = ({ service, children }) => {
  return (
    <ConnectionInvitationServiceContext.Provider value={service}>
      {children}
    </ConnectionInvitationServiceContext.Provider>
  )
}

export const useConnectionInvitationService = () => {
  const context = useContext(ConnectionInvitationServiceContext)
  if (!context) {
    throw new Error('useConnectionInvitationService must be used within a ConnectionInvitationServiceProvider')
  }

  return context
}
