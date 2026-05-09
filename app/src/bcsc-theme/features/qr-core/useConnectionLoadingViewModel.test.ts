import { renderHook } from '@testing-library/react-native'

import useConnectionLoadingViewModel, { GoalCodes } from './useConnectionLoadingViewModel'

const mocks = {
  oob: undefined as any,
  conn: undefined as any,
  notifications: [] as any[],
}

jest.mock('@bifold/core', () => ({
  useOutOfBandById: () => mocks.oob,
  useConnectionByOutOfBandId: () => mocks.conn,
  useNotifications: () => mocks.notifications,
}))

const setOob = (goalCode?: string, threadIds: string[] = [], reuseConnectionId?: string) => {
  mocks.oob = {
    outOfBandInvitation: { goalCode },
    reuseConnectionId,
    getTags: () => ({ invitationRequestsThreadIds: threadIds }),
  }
}

const setConnection = (id: string | undefined) => {
  mocks.conn = id ? { id } : undefined
}

beforeEach(() => {
  mocks.oob = undefined
  mocks.conn = undefined
  mocks.notifications = []
})

describe('useConnectionLoadingViewModel', () => {
  it('reports loading while no notification or connection is present', () => {
    setOob()
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'loading' })
  })

  it('lands on connection state when connection arrives without a goal code', () => {
    setOob(undefined)
    setConnection('conn-1')
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'connection' })
  })

  it('returns proof state when goal code matches and notification is for the connection', () => {
    setOob(GoalCodes.proofRequestVerify)
    setConnection('conn-1')
    mocks.notifications = [{ id: 'p-1', type: 'DidCommProofExchangeRecord', connectionId: 'conn-1' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'proof', proofId: 'p-1' })
  })

  it('returns credentialOffer state when goal code matches credentialOffer', () => {
    setOob(GoalCodes.credentialOffer)
    setConnection('conn-1')
    mocks.notifications = [{ id: 'cred-1', type: 'DidCommCredentialExchangeRecord', connectionId: 'conn-1' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'credentialOffer', credentialId: 'cred-1' })
  })

  it('matches notifications by oob thread id when no direct connection match', () => {
    setOob(GoalCodes.proofRequestVerify, ['thread-42'])
    setConnection(undefined)
    mocks.notifications = [{ id: 'p-2', type: 'DidCommProofExchangeRecord', threadId: 'thread-42' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'proof', proofId: 'p-2' })
  })

  it('matches notifications via reuseConnectionId', () => {
    setOob(GoalCodes.credentialOffer, [], 'conn-reuse')
    setConnection(undefined)
    mocks.notifications = [{ id: 'c-2', type: 'DidCommCredentialExchangeRecord', connectionId: 'conn-reuse' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'credentialOffer', credentialId: 'c-2' })
  })

  it('ignores BasicMessageRecord notifications', () => {
    setOob(GoalCodes.proofRequestVerify)
    setConnection('conn-1')
    mocks.notifications = [{ id: 'msg-1', type: 'BasicMessageRecord', connectionId: 'conn-1' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'loading' })
  })

  it('handles connectionless proof requests (no connection, notification arrives)', () => {
    setOob(undefined, ['thread-9'])
    setConnection(undefined)
    mocks.notifications = [{ id: 'p-3', type: 'DidCommProofExchangeRecord', threadId: 'thread-9' }]
    const { result } = renderHook(() => useConnectionLoadingViewModel('oob-1'))
    expect(result.current).toEqual({ kind: 'proof', proofId: 'p-3' })
  })
})
