import { storage } from '@/bcsc-theme/storage'
import { initialBCSCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import StartVerificationNotification from './StartVerificationNotification'

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

describe('StartVerificationNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseServerStatus.mockReturnValue({ isAvailable: true })
  })

  // Every app-slice value the BCSC store held during the test; the verify-prompt answer lives there
  let appStates: unknown[] = []
  let unsubscribe = () => {}
  beforeEach(() => {
    appStates = []
    unsubscribe = storage.store.subscribe((state, previous) => {
      if (state.app !== previous.app) {
        appStates.push(state.app)
      }
    })
  })
  afterEach(() => unsubscribe())
  const bcscWrites = () => appStates

  it('marks verification started for a user who skipped, keeping their answer to the prompt', async () => {
    const tree = render(
      <BasicAppContext initialStateOverride={{ bcsc: { ...initialBCSCState, verificationSkipped: true } }}>
        <StartVerificationNotification />
      </BasicAppContext>
    )

    await act(async () => {
      fireEvent.press(tree.getByTestId(testIdWithKey(TestIds.main.notification.view)))
    })

    // A relaunch now resumes verification, and the user still counts as one who skipped
    expect(bcscWrites()).toContainEqual(
      expect.objectContaining({ verificationSkipped: true, verificationStarted: true })
    )
    expect(bcscWrites()).not.toContainEqual(expect.objectContaining({ verificationSkipped: false }))
  })
})
