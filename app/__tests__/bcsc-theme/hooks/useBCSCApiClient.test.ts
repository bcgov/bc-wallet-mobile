import { useBCSCApiClient, useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { renderHook } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../../__mocks__/helpers/app'

jest.unmock('@/bcsc-theme/hooks/useBCSCApiClient')

describe('BCSC API Client Hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  describe('useBCSCApiClient', () => {
    it('should throw if used outside of BCSCApiClientProvider', () => {
      try {
        renderHook(() => useBCSCApiClient(), { wrapper: BasicAppContext })
      } catch (error: any) {
        expect(error.message).toContain('within a BCSCApiClientProvider')
      }
    })

    it('should throw if BCSCClientProvider reports an error', () => {
      const mockContext = { error: 'Test error', client: null, isClientReady: false }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient(), { wrapper: BasicAppContext })
      } catch (error: any) {
        expect(error.message).toBe('BCSC client error: Test error')
      }
    })

    it('should throw if client is not ready', () => {
      const mockContext = { error: null, client: null, isClientReady: false }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient(), { wrapper: BasicAppContext })
      } catch (error: any) {
        expect(error.message).toContain('client not ready')
      }
    })

    it('should throw if client is undefined', () => {
      const mockContext = { error: null, client: null, isClientReady: true }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      try {
        renderHook(() => useBCSCApiClient(), { wrapper: BasicAppContext })
      } catch (error: any) {
        expect(error.message).toContain('client not ready')
      }
    })

    it('should return the client if ready and no errors', () => {
      const mockClient = {}
      const mockContext = { error: null, client: mockClient, isClientReady: true }

      jest.spyOn(React, 'useContext').mockReturnValue(mockContext)

      const { result } = renderHook(() => useBCSCApiClient(), { wrapper: BasicAppContext })
      expect(result.current).toBe(mockClient)
    })
  })

  describe('useBCSCApiClientState', () => {
    it('should throw if used outside of BCSCApiClientProvider', () => {
      try {
        renderHook(() => useBCSCApiClientState(), { wrapper: BasicAppContext })
      } catch (error: any) {
        expect(error.message).toContain('within a BCSCApiClientProvider')
      }
    })
  })
})
