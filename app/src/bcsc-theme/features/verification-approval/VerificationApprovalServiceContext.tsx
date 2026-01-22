import React, { createContext, useContext } from 'react'

import { VerificationApprovalService } from './VerificationApprovalService'

const VerificationApprovalServiceContext = createContext<VerificationApprovalService | null>(null)

export const VerificationApprovalServiceProvider: React.FC<{
  service: VerificationApprovalService
  children: React.ReactNode
}> = ({ service, children }) => {
  return (
    <VerificationApprovalServiceContext.Provider value={service}>
      {children}
    </VerificationApprovalServiceContext.Provider>
  )
}

export const useVerificationApprovalService = () => {
  const context = useContext(VerificationApprovalServiceContext)
  if (!context) {
    throw new Error('useVerificationApprovalService must be used within a VerificationApprovalServiceProvider')
  }

  return context
}
