import React, { createContext, useContext } from 'react'
import { FcmService } from './services/fcm-service'

const FcmServiceContext = createContext<FcmService | null>(null)

export const FcmServiceProvider: React.FC<{
  service: FcmService
  children: React.ReactNode
}> = ({ service, children }) => {
  return <FcmServiceContext.Provider value={service}>{children}</FcmServiceContext.Provider>
}

export const useFcmService = () => {
  const context = useContext(FcmServiceContext)
  if (!context) {
    throw new Error('useFcmService must be used within a FcmServiceProvider')
  }

  return context
}
