import React, { createContext, useContext } from 'react'

import { FcmViewModel } from './FcmViewModel'

const FcmViewModelContext = createContext<FcmViewModel | null>(null)

export const FcmViewModelProvider: React.FC<{
  viewModel: FcmViewModel
  children: React.ReactNode
}> = ({ viewModel, children }) => {
  return <FcmViewModelContext.Provider value={viewModel}>{children}</FcmViewModelContext.Provider>
}

export const useFcmViewModel = () => {
  const context = useContext(FcmViewModelContext)
  if (!context) {
    throw new Error('useFcmViewModel must be used within a FcmViewModelProvider')
  }

  return context
}
