import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { useVerificationExitPolicy } from './useVerificationExitPolicy'

jest.mock('@bifold/core')

const storeWith = (verificationSkipped: boolean | undefined, developerModeEnabled = false) =>
  ({ bcsc: { verificationSkipped }, preferences: { developerModeEnabled } }) as any

describe('useVerificationExitPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('makes a user who chose to verify at the prompt a first-time verifier with no Back to home', () => {
    jest.mocked(Bifold.useStore).mockReturnValue([storeWith(false), jest.fn()])

    const { result } = renderHook(() => useVerificationExitPolicy())

    expect(result.current).toEqual({ isFirstTimeVerifier: true, showBackToHomeMenuRow: false })
  })

  it('offers Back to home to a user who skipped the prompt', () => {
    jest.mocked(Bifold.useStore).mockReturnValue([storeWith(true), jest.fn()])

    const { result } = renderHook(() => useVerificationExitPolicy())

    expect(result.current).toEqual({ isFirstTimeVerifier: false, showBackToHomeMenuRow: true })
  })

  it('treats an unanswered prompt as deferred (its own buttons are the exits)', () => {
    jest.mocked(Bifold.useStore).mockReturnValue([storeWith(undefined), jest.fn()])

    const { result } = renderHook(() => useVerificationExitPolicy())

    expect(result.current).toEqual({ isFirstTimeVerifier: false, showBackToHomeMenuRow: true })
  })

  it('shows Back to home to a first-time verifier in developer mode without changing their kind', () => {
    jest.mocked(Bifold.useStore).mockReturnValue([storeWith(false, true), jest.fn()])

    const { result } = renderHook(() => useVerificationExitPolicy())

    expect(result.current).toEqual({ isFirstTimeVerifier: true, showBackToHomeMenuRow: true })
  })
})
