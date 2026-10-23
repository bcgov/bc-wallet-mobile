import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { BCState, initialState, VerificationStatus } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import IdentitySelectionScreen from './IdentitySelectionScreen'

jest.mock('@/bcsc-theme/hooks/useVerificationReset', () => ({
  useVerificationReset: jest.fn(),
}))

type BeforeRemoveListener = (event: { data: { action: { type: string } } }) => void

describe('IdentitySelection', () => {
  const mockVerificationReset = jest.fn()
  let mockNavigation: { navigate: jest.Mock; addListener: jest.Mock }
  let beforeRemove: BeforeRemoveListener | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    beforeRemove = undefined
    mockVerificationReset.mockResolvedValue(true)
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
})
