import React from 'react'
import { renderHook } from '@testing-library/react-native'

import { VerificationApprovalService } from './VerificationApprovalService'
import {
  VerificationApprovalServiceProvider,
  useVerificationApprovalService,
} from './VerificationApprovalServiceContext'

describe('VerificationApprovalServiceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })

  const createWrapper = (service: VerificationApprovalService) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <VerificationApprovalServiceProvider service={service}>{children}</VerificationApprovalServiceProvider>
    )
    Wrapper.displayName = 'VerificationApprovalServiceWrapper'
    return Wrapper
  }

  describe('useVerificationApprovalService hook', () => {
    it('should throw error when used outside VerificationApprovalServiceProvider', () => {
      // Suppress React's act warning for this test since we're testing error behavior
      // This is a known false positive when testing error cases with renderHook
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
        // Suppress the act(async) warning which is a false positive when testing error cases
        if (typeof message === 'string' && message.includes('act(async')) {
          return
        }
        // Allow other errors through (though we expect the hook to throw, not console.error)
      })

      expect(() => renderHook(() => useVerificationApprovalService())).toThrow(
        'useVerificationApprovalService must be used within a VerificationApprovalServiceProvider'
      )

      consoleErrorSpy.mockRestore()
    })

    it('should return the service when used within VerificationApprovalServiceProvider', () => {
      const logger = createMockLogger()
      const service = new VerificationApprovalService(logger as any)

      const { result } = renderHook(() => useVerificationApprovalService(), {
        wrapper: createWrapper(service),
      })

      expect(result.current).toBe(service)
      expect(result.current).toBeInstanceOf(VerificationApprovalService)
    })

    it('should provide the same service instance to multiple consumers', () => {
      const logger = createMockLogger()
      const service = new VerificationApprovalService(logger as any)

      const { result: result1 } = renderHook(() => useVerificationApprovalService(), {
        wrapper: createWrapper(service),
      })

      const { result: result2 } = renderHook(() => useVerificationApprovalService(), {
        wrapper: createWrapper(service),
      })

      expect(result1.current).toBe(service)
      expect(result2.current).toBe(service)
      expect(result1.current).toBe(result2.current)
    })
  })
})
