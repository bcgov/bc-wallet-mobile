import { storage } from '@/bcsc-theme/storage'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { OnboardingIntroScreen } from './OnboardingIntroScreen'

describe('OnboardingIntro', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <OnboardingIntroScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('records the intro as seen and fires onContinue when Continue is pressed', async () => {
    const onContinue = jest.fn()
    const { getByTestId } = render(
      <BasicAppContext>
        <OnboardingIntroScreen onContinue={onContinue} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('com.ariesbifold:id/Continue'))

    // SEEN_ONBOARDING_INTRO persists the flag on the bcsc slice so the intro is not shown again.
    await waitFor(() => {
      expect(storage.store.getState().app).toMatchObject({ hasSeenOnboardingIntro: true })
    })
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
