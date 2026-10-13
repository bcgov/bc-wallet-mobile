import { BCLocalStorageKeys, BCState, initialState, VerificationStatus } from '@/store'
import { PersistentStorage, useStore } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { VerifyPromptScreen } from './VerifyPromptScreen'

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

/** Exposes the current verified status in the tree so tests can observe useLeaveVerification. */
const VerifiedStatusProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="VerifiedStatusProbe">{store.bcscSecure.verifiedStatus}</Text>
}

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

  it('persists verificationSkipped=false, marks verification started and advances when the user chooses to verify now', async () => {
    const onAnswered = jest.fn()
    const onContinue = jest.fn()
    const tree = renderScreen({ onAnswered, onContinue })

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: false }))
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationStarted: true }))
  })

  it('persists verificationSkipped=true without starting verification when the user skips', async () => {
    const onAnswered = jest.fn()
    const tree = renderScreen({ onAnswered })

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/SkipVerification'))
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: true }))
    expect(bcscWrites()).not.toContainEqual(expect.objectContaining({ verificationStarted: true }))
  })

  it('leaves the flow when a first-time verifier walks back to the prompt and skips', async () => {
    // Back from the first step replaced onto the prompt: verification is still IN_PROGRESS, which alone
    // keeps VerifyStack mounted, so Skip has to move the status out of it to reach Home
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcsc: { ...initialState.bcsc, verificationSkipped: false, verificationStarted: true },
          bcscSecure: { ...initialState.bcscSecure, verifiedStatus: VerificationStatus.IN_PROGRESS },
        }}
      >
        <VerifyPromptScreen />
        <VerifiedStatusProbe />
      </BasicAppContext>
    )

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/SkipVerification'))
    })

    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.UNVERIFIED)
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationSkipped: true }))
    // Progress is kept: started stays set, so the Home card (and the next launch) resume the step
    expect(bcscWrites()).not.toContainEqual(expect.objectContaining({ verificationStarted: false }))
  })

  it('hides the skip button when showSkip is false (main-app entry)', () => {
    const tree = renderScreen({ showSkip: false })

    expect(tree.queryByTestId('com.ariesbifold:id/SkipVerification')).toBeNull()
    expect(tree.getByTestId('com.ariesbifold:id/Continue')).toBeTruthy()
  })

  it('marks verification started from the main-app entry without answering the onboarding prompt', async () => {
    const tree = renderScreen({ showSkip: false })

    await act(async () => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/Continue'))
    })

    // Reached from Home after skipping: entering verification here must not turn a skipper into a
    // first-time verifier
    expect(bcscWrites()).toContainEqual(expect.objectContaining({ verificationStarted: true }))
    expect(bcscWrites()).not.toContainEqual(expect.objectContaining({ verificationSkipped: false }))
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

      expect(tree.getByText('BCSC.Loading.DefaultMessage')).toBeTruthy()
      expect(tree.queryByTestId('com.ariesbifold:id/Continue')).toBeNull()
      expect(useNavigation().navigate).not.toHaveBeenCalled()
    })
  })
})
