import { renderHook } from '@testing-library/react-native'
import React from 'react'
import { VerificationResponseService } from './VerificationResponseService'
import {
  VerificationResponseServiceProvider,
  useVerificationResponseService,
} from './VerificationResponseServiceContext'

describe('VerificationResponseServiceContext', () => {
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
      expect(() => renderHook(() => useVerificationResponseService())).toThrow(
        'useVerificationResponseService must be used within a VerificationResponseServiceProvider'
      )
    })

    it('should return the service when used within VerificationResponseServiceProvider', () => {
      const logger = createMockLogger()
      const service = new VerificationResponseService(logger as any)

      const { result } = renderHook(() => useVerificationResponseService(), {
        wrapper: createWrapper(service),
      })

      expect(result.current).toBe(service)
    })

    it('should provide the same service instance to multiple consumers', () => {
      const logger = createMockLogger()
      const service = new VerificationResponseService(logger as any)

      // Two consumers under ONE provider — rendering two separate trees would only prove that a
      // local constant equals itself, not that the context is shared.
      const { result } = renderHook(
        () => [useVerificationResponseService(), useVerificationResponseService()] as const,
        { wrapper: createWrapper(service) }
      )

      const [first, second] = result.current
      expect(first).toBe(service)
      expect(second).toBe(first)
    })
  })
})
