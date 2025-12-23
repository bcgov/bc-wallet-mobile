import { act, renderHook } from '@testing-library/react-native'
import React from 'react'

import { PairingService } from '../PairingService'
import { PairingServiceProvider } from '../PairingServiceContext'
import { usePendingPairing } from '../usePendingPairing'

describe('usePendingPairing', () => {
  const createMockLogger = () => ({
    info: jest.fn(),
    debug: jest.fn(),
  })

  const createWrapper = (service: PairingService) => {
    return ({ children }: { children: React.ReactNode }) => (
      <PairingServiceProvider service={service}>{children}</PairingServiceProvider>
    )
  }

  it('returns false when no pending pairing exists', () => {
    const service = new PairingService(createMockLogger() as any)

    const { result } = renderHook(() => usePendingPairing(), {
      wrapper: createWrapper(service),
    })

    expect(result.current).toBe(false)
  })

  it('returns true when a pending pairing exists', () => {
    const service = new PairingService(createMockLogger() as any)

    // Create pending pairing before rendering the hook
    service.handlePairing({
      serviceTitle: 'Test Service',
      pairingCode: 'CODE123',
      source: 'deep-link',
    })

    const { result } = renderHook(() => usePendingPairing(), {
      wrapper: createWrapper(service),
    })

    expect(result.current).toBe(true)
  })

  it('updates when pending state changes', () => {
    const service = new PairingService(createMockLogger() as any)

    const { result } = renderHook(() => usePendingPairing(), {
      wrapper: createWrapper(service),
    })

    expect(result.current).toBe(false)

    act(() => {
      service.handlePairing({
        serviceTitle: 'Test Service',
        pairingCode: 'CODE123',
        source: 'fcm',
      })
    })

    expect(result.current).toBe(true)

    act(() => {
      service.consumePendingPairing()
    })

    expect(result.current).toBe(false)
  })
})
