import React, { createContext, useContext } from 'react'

import { VerificationResponseService } from './VerificationResponseService'

const VerificationResponseServiceContext = createContext<VerificationResponseService | null>(null)

export const VerificationResponseServiceProvider: React.FC<{
  service: VerificationResponseService
  children: React.ReactNode
}> = ({ service, children }) => {
  return (
    <VerificationResponseServiceContext.Provider value={service}>
      {children}
    </VerificationResponseServiceContext.Provider>
  )
}

export const useVerificationResponseService = () => {
  const context = useContext(VerificationResponseServiceContext)
  if (!context) {
    throw new Error('useVerificationResponseService must be used within a VerificationResponseServiceProvider')
  }

  return context
}
