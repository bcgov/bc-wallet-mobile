import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { VerifyPromptScreen } from './VerifyPromptScreen'

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

describe('VerifyPromptScreen', () => {
  let storeSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseServerStatus.mockReturnValue({ isAvailable: true, isChecking: false, serverStatus: {} })
    storeSpy = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue()
  })

  const renderScreen = (props: Partial<React.ComponentProps<typeof VerifyPromptScreen>> = {}) =>
    render(
      <BasicAppContext>
        <VerifyPromptScreen {...props} />
      </BasicAppContext>
    )

  const bcscWrites = () =>
    storeSpy.mock.calls.filter(([key]) => key === BCLocalStorageKeys.BCSC).map(([, value]) => value)

  it('persists verificationSkipped=false and advances when the user chooses to verify now', async () => {
    const onAnswered = jest.fn()
    const onContinue = jest.fn()
    const tree = renderScreen({ onAnswered, onContinue })

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: false }))
  })

  it('persists verificationSkipped=true when the user skips verification', async () => {
    const onAnswered = jest.fn()
    const tree = renderScreen({ onAnswered })

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/SkipVerification'))
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: true }))
  })

  it('hides the skip button when showSkip is false (main-app entry)', () => {
    const tree = renderScreen({ showSkip: false })

    expect(tree.queryByTestId('com.ariesbifold:id/SkipVerification')).toBeNull()
    expect(tree.getByTestId('com.ariesbifold:id/Continue')).toBeTruthy()
  })

  describe('during an IAS outage', () => {
    beforeEach(() => {
      mockUseServerStatus.mockReturnValue({ isAvailable: false, isChecking: false, serverStatus: {} })
    })

    // Rendered inline rather than navigated to: on a fresh launch the prompt mounts in the same
    // commit as VerifyStack, and a navigate from a mount effect is dropped by the navigator's init.
    it('renders the ServiceOutage screen in place of the prompt', () => {
      const tree = renderScreen()

      expect(tree.queryByTestId('com.ariesbifold:id/Continue')).toBeNull()
      expect(tree.getByTestId('com.ariesbifold:id/ServiceOutageCheckAgain')).toBeTruthy()
      expect(useNavigation().navigate).not.toHaveBeenCalled()
    })

    it('lets the user skip verification from the outage screen', async () => {
      const onAnswered = jest.fn()
      const tree = renderScreen({ onAnswered })

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ServiceOutageSkipVerification'))
      })

      expect(onAnswered).toHaveBeenCalledTimes(1)
      expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: true }))
    })

    it('hides skip on the outage screen when showSkip is false (main-app entry)', () => {
      const tree = renderScreen({ showSkip: false })

      expect(tree.queryByTestId('com.ariesbifold:id/ServiceOutageSkipVerification')).toBeNull()
      expect(tree.getByTestId('com.ariesbifold:id/ServiceOutageCheckAgain')).toBeTruthy()
    })

    it('shows a loading state while the first status check is still running', () => {
      mockUseServerStatus.mockReturnValue({ isAvailable: true, isChecking: true, serverStatus: null })

      const tree = renderScreen()

      expect(tree.queryByTestId('com.ariesbifold:id/Continue')).toBeNull()
      expect(useNavigation().navigate).not.toHaveBeenCalled()
    })
  })
})
