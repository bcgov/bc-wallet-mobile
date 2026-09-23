import { BCSCApiClientContext, BCSCApiClientContextType } from '@/bcsc-theme/contexts/BCSCApiClientContext'
import { useBCSCApiClient, useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { renderHook } from '@testing-library/react-native'
import React, { PropsWithChildren } from 'react'

jest.unmock('@/bcsc-theme/hooks/useBCSCApiClient')

const withClientContext = (value: BCSCApiClientContextType) => {
  const ClientContextWrapper = ({ children }: PropsWithChildren) =>
    React.createElement(BCSCApiClientContext.Provider, { value }, children)

  return ClientContextWrapper
}

describe('BCSC API Client Hooks', () => {
  describe('useBCSCApiClient', () => {
    it('should throw if used outside of BCSCApiClientProvider', () => {
      expect(() => renderHook(() => useBCSCApiClient())).toThrow('must be used within a BCSCApiClientProvider')
    })

    it('should throw if BCSCClientProvider reports an error', () => {
      const wrapper = withClientContext({ error: 'Test error', client: null, isClientReady: false })

      expect(() => renderHook(() => useBCSCApiClient(), { wrapper })).toThrow('BCSC client error: Test error')
    })

    it('should throw if client is not ready', () => {
      const wrapper = withClientContext({ error: null, client: null, isClientReady: false })

      expect(() => renderHook(() => useBCSCApiClient(), { wrapper })).toThrow('BCSC client not ready')
    })

    it('should throw if client is undefined', () => {
      const wrapper = withClientContext({ error: null, client: null, isClientReady: true })

      expect(() => renderHook(() => useBCSCApiClient(), { wrapper })).toThrow('BCSC client not ready')
    })

    it('should return the client if ready and no errors', () => {
      const mockClient = {} as BCSCApiClientContextType['client']
      const wrapper = withClientContext({ error: null, client: mockClient, isClientReady: true })

      const { result } = renderHook(() => useBCSCApiClient(), { wrapper })

      expect(result.current).toBe(mockClient)
    })
  })

  describe('useBCSCApiClientState', () => {
    it('should return a default not-ready state when used outside of BCSCApiClientProvider', () => {
      const { result } = renderHook(() => useBCSCApiClientState())

      expect(result.current).toEqual({ client: null, isClientReady: false, error: null })
    })

    it('should return the provider context when inside a BCSCApiClientProvider', () => {
      const context = { error: null, client: null, isClientReady: false }
      const { result } = renderHook(() => useBCSCApiClientState(), { wrapper: withClientContext(context) })

      expect(result.current).toBe(context)
    })
  })
})
