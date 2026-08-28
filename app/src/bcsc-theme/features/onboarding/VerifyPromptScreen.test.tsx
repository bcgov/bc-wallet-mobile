import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { VerifyPromptScreen } from './VerifyPromptScreen'

describe('VerifyPromptScreen', () => {
  let storeSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
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
})
