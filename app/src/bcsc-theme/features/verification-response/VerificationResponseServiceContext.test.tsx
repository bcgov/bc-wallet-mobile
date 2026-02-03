import { renderHook } from '@testing-library/react-native'
import React from 'react'

import { VerificationResponseService } from './VerificationResponseService'
import {
  VerificationResponseServiceProvider,
  useVerificationResponseService,
} from './VerificationResponseServiceContext'

describe('VerificationResponseServiceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })

  const createWrapper = (service: VerificationResponseService) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <VerificationResponseServiceProvider service={service}>{children}</VerificationResponseServiceProvider>
    )
    Wrapper.displayName = 'VerificationResponseServiceWrapper'
    return Wrapper
  }

  describe('useVerificationResponseService hook', () => {
    it('should throw error when used outside VerificationResponseServiceProvider', () => {
      // Suppress React's act warning for this test since we're testing error behavior
      // This is a known false positive when testing error cases with renderHook
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
        // Suppress the act(async) warning which is a false positive when testing error cases
        if (typeof message === 'string' && message.includes('act(async')) {
          return
        }
        // Allow other errors through (though we expect the hook to throw, not console.error)
      })

      expect(() => renderHook(() => useVerificationResponseService())).toThrow(
        'useVerificationResponseService must be used within a VerificationResponseServiceProvider'
      )

      consoleErrorSpy.mockRestore()
    })

    it('should return the service when used within VerificationResponseServiceProvider', () => {
      const logger = createMockLogger()
      const service = new VerificationResponseService(logger as any)

      const { result } = renderHook(() => useVerificationResponseService(), {
        wrapper: createWrapper(service),
      })

      expect(result.current).toBe(service)
      expect(result.current).toBeInstanceOf(VerificationResponseService)
    })

    it('should provide the same service instance to multiple consumers', () => {
      const logger = createMockLogger()
      const service = new VerificationResponseService(logger as any)

      const { result: result1 } = renderHook(() => useVerificationResponseService(), {
        wrapper: createWrapper(service),
      })

      const { result: result2 } = renderHook(() => useVerificationResponseService(), {
        wrapper: createWrapper(service),
      })

      expect(result1.current).toBe(service)
      expect(result2.current).toBe(service)
      expect(result1.current).toBe(result2.current)
    })
  })
})
