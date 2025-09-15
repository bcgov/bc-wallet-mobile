import { useContext } from 'react'
import BCSCApiClient from '../api/client'
import { BCSCApiClientContext } from '../contexts/BCSCApiClientContext'

// Hook to be used for API calls, will throw if not configured properly
export const useBCSCApiClient = (): BCSCApiClient => {
  const context = useContext(BCSCApiClientContext)

  if (!context) {
    throw new Error('useBCSCApiClient must be used within a BCSCClientProvider')
  }

  if (context.error) {
    throw new Error(`BCSC client error: ${context.error}`)
  }

  if (!context.client || !context.isReady) {
    throw new Error('BCSC client not ready. Make sure BCSCClientProvider is properly configured.')
  }

  return context.client
}

// Hook that doesn't throw, useful for checking readiness state
export const useBCSCApiClientState = () => {
  const context = useContext(BCSCApiClientContext)

  if (!context) {
    throw new Error('useBCSCClientState must be used within a BCSCClientProvider')
  }

  return context
}
