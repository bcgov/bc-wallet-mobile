import { useBCSCApiClient, useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { renderHook } from '@testing-library/react-native'
import React from 'react'

describe('BCSC API Client Hooks', () => {
  describe('useBCSCApiClient', () => {
    it('should throw if used outside of BCSCApiClientProvider', () => {
      try {
        renderHook(() => useBCSCApiClient())
      } catch (error: any) {
        expect(error.message).toContain('within a BCSCApiClientProvider')
      }
    })

    it('should throw if BCSCClientProvider reports an error', () => {
      const mockContext = { error: 'Test error', client: null, clientIsReady: false }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient())
      } catch (error: any) {
        expect(error.message).toBe('BCSC client error: Test error')
      }
    })

    it('should throw if client is not ready', () => {
      const mockContext = { error: null, client: null, clientIsReady: false }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient())
      } catch (error: any) {
        expect(error.message).toContain('client not ready')
      }
    })

    it('should throw if client is undefined', () => {
      const mockContext = { error: null, client: null, clientIsReady: true }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient())
      } catch (error: any) {
        expect(error.message).toContain('client not ready')
      }
    })

    it('should return the client if ready and no errors', () => {
      const mockClient = {}
      const mockContext = { error: null, client: mockClient, clientIsReady: true }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      const { result } = renderHook(() => useBCSCApiClient())
      expect(result.current).toBe(mockClient)
    })
  })

  describe('useBCSCApiClientState', () => {
    it('should throw if used outside of BCSCApiClientProvider', () => {
      try {
        renderHook(() => useBCSCApiClientState())
      } catch (error: any) {
        expect(error.message).toContain('within a BCSCApiClientProvider')
      }
    })
  })
})
