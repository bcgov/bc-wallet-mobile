import React, { createContext, useContext, useMemo } from 'react'
import { FcmViewModel } from './FcmViewModel'
import { FcmService } from './services/fcm-service'

type FcmServiceContextType = {
  service: FcmService
  viewModel: FcmViewModel
}

const FcmServiceContext = createContext<FcmServiceContextType | null>(null)

export const FcmServiceProvider: React.FC<{
  service: FcmService
  viewModel: FcmViewModel
  children: React.ReactNode
}> = ({ service, viewModel, children }) => {
  const memoedValue = useMemo(() => ({ service, viewModel }), [service, viewModel])
  return <FcmServiceContext.Provider value={memoedValue}>{children}</FcmServiceContext.Provider>
}

export const useFcmService = () => {
  const context = useContext(FcmServiceContext)
  if (!context) {
    throw new Error('useFcmService must be used within a FcmServiceProvider')
  }

  return context
}
