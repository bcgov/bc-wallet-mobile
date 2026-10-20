import { AccountPhase, AccountPhaseType } from '@/bcsc-theme/utils/account-phase'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { useAccountPhase } from './useAccountPhase'
import { useCardStatus } from './useCardStatus'

jest.mock('@bifold/core')
jest.mock('./useAccountPhase', () => ({ useAccountPhase: jest.fn() }))

const expiresAt = new Date('2027-10-19T00:00:00.000Z')

const setup = (verified: boolean, phase: AccountPhase) => {
  jest.mocked(Bifold.useStore).mockReturnValue([{ bcscSecure: { verified } } as any, jest.fn()])
  jest.mocked(useAccountPhase).mockReturnValue(phase)

  return renderHook(() => useCardStatus())
}

describe('useCardStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('is expired, and not actively verified, when the account phase is expired', () => {
    const { result } = setup(true, { phase: AccountPhaseType.Expired })

    expect(result.current.isExpired).toBe(true)
    expect(result.current.isActivelyVerified).toBe(false)
  })

  it.each([
    ['active', { phase: AccountPhaseType.Active, expiresAt } as AccountPhase],
    ['expiringSoon', { phase: AccountPhaseType.ExpiringSoon, expiresAt } as AccountPhase],
    ['unknown', { phase: AccountPhaseType.Unknown } as AccountPhase],
  ])('is actively verified when verified and the account phase is %s', (_name, phase) => {
    const { result } = setup(true, phase)

    expect(result.current.isExpired).toBe(false)
    expect(result.current.isActivelyVerified).toBe(true)
  })

  it('is neither expired nor actively verified when the account phase is none', () => {
    const { result } = setup(false, { phase: AccountPhaseType.None })

    expect(result.current.isExpired).toBe(false)
    expect(result.current.isActivelyVerified).toBe(false)
  })
})
