import { DeepLinkViewModel } from '@/services/DeepLinkViewModel'
import React, { createContext, useContext } from 'react'

const DeepLinkViewModelContext = createContext<DeepLinkViewModel | null>(null)

export const DeepLinkViewModelProvider: React.FC<{
  viewModel: DeepLinkViewModel
  children: React.ReactNode
}> = ({ viewModel, children }) => {
  return <DeepLinkViewModelContext.Provider value={viewModel}>{children}</DeepLinkViewModelContext.Provider>
}

export const useDeepLinkViewModel = () => {
  const context = useContext(DeepLinkViewModelContext)
  if (!context) {
    throw new Error('useDeepLinkViewModel must be used within a DeepLinkViewModelProvider')
  }

  return context
}
