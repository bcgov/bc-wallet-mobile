import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { useRateLimit } from '@/bcsc-theme/services/hooks/useRateLimit'
import { RateLimitedAction, RateLimitWaitType } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, initialState, VerificationStatus } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import IdentitySelectionScreen from './IdentitySelectionScreen'

jest.mock('@/bcsc-theme/hooks/useVerificationReset', () => ({
  useVerificationReset: jest.fn(),
}))

jest.mock('@/bcsc-theme/services/hooks/useRateLimit', () => ({
  useRateLimit: jest.fn(),
}))

const mockDeleteCardInfo = jest.fn()
const mockUpdateCardProcess = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ deleteScannedCardData: mockDeleteCardInfo, updateCardProcess: mockUpdateCardProcess }),
}))

type BeforeRemoveListener = (event: { data: { action: { type: string } } }) => void

describe('IdentitySelection', () => {
  const mockVerificationReset = jest.fn()
  const mockGetWait = jest.fn()
  let mockNavigation: { navigate: jest.Mock; addListener: jest.Mock }
  let beforeRemove: BeforeRemoveListener | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    beforeRemove = undefined
    mockVerificationReset.mockResolvedValue(true)
    mockGetWait.mockReturnValue({ type: RateLimitWaitType.None })
    jest.mocked(useRateLimit).mockReturnValue({ getWait: mockGetWait, recordRateLimit: jest.fn() })
    jest.mocked(useVerificationReset).mockReturnValue(mockVerificationReset)
    mockNavigation = {
      navigate: jest.fn(),
      addListener: jest.fn((event: string, listener: BeforeRemoveListener) => {
        if (event === 'beforeRemove') {
          beforeRemove = listener
        }
        return jest.fn()
      }),
    }
  })

  const renderScreen = (state?: Partial<BCState>) =>
    render(
      <BasicAppContext initialStateOverride={state}>
        <BCSCLoadingProvider>
          <IdentitySelectionScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

  const authorized: Partial<BCState> = {
    bcscSecure: { ...initialState.bcscSecure, deviceCode: 'device-code', userCode: 'user-code' },
  }

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree).toMatchSnapshot()
  })

  it('resets the registration when the user pops back out after authorizing, keeping the flow mounted', async () => {
    renderScreen(authorized)

    await act(async () => {
      beforeRemove?.({ data: { action: { type: 'POP' } } })
    })

    // The pop goes ahead to the setup question, so the reset must not drop the user to Home
    expect(mockVerificationReset).toHaveBeenCalledWith({ verifiedStatus: VerificationStatus.IN_PROGRESS })
  })

  it('does not reset on a replace (a resumed initial route walking back keeps its progress)', async () => {
    renderScreen(authorized)

    await act(async () => {
      beforeRemove?.({ data: { action: { type: 'REPLACE' } } })
    })

    expect(mockVerificationReset).not.toHaveBeenCalled()
  })

  it('does not reset when nothing was authorized yet', async () => {
    renderScreen()

    await act(async () => {
      beforeRemove?.({ data: { action: { type: 'GO_BACK' } } })
    })

    expect(mockVerificationReset).not.toHaveBeenCalled()
  })
  describe('card scan option', () => {
    const withCardData: Partial<BCState> = {
      bcscSecure: { ...initialState.bcscSecure, serial: '12345', birthdate: new Date('1990-01-01') },
    }
    const pressScan = async (state?: Partial<BCState>) => {
      const { getByTestId } = renderScreen(state)
      await act(async () => {
        fireEvent.press(getByTestId(testIdWithKey(TestIds.verify.identitySelection.scan)))
      })
    }

    it('opens the serial scanner and clears stale card data when not waiting', async () => {
      await pressScan(withCardData)

      expect(mockGetWait).toHaveBeenCalledWith(RateLimitedAction.CardAdd)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ScanSerial)
      expect(mockDeleteCardInfo).toHaveBeenCalled()
      expect(mockUpdateCardProcess).toHaveBeenCalledWith(null)
    })

    it('opens the lockout screen instead, leaving card data alone, while rate limited', async () => {
      mockGetWait.mockReturnValue({ type: RateLimitWaitType.Waiting, retryAt: new Date(), minutes: 4 })

      await pressScan(withCardData)

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.BirthdateLockout)
      expect(mockDeleteCardInfo).not.toHaveBeenCalled()
      expect(mockUpdateCardProcess).not.toHaveBeenCalled()
    })
  })
})
