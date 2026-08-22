import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import RemoteLogWarning from './RemoteLogWarning'

const renderScreen = () => {
  const onEnablePressed = jest.fn()
  const onBackPressed = jest.fn()

  const screen = render(
    <BasicAppContext>
      <RemoteLogWarning onEnablePressed={onEnablePressed} onBackPressed={onBackPressed} />
    </BasicAppContext>
  )

  return { ...screen, onEnablePressed, onBackPressed }
}

describe('RemoteLogWarning Screen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the collection notice and the consent controls', () => {
    const { getByTestId, getByText } = renderScreen()

    expect(getByText('RemoteLogging.Heading')).toBeTruthy()
    expect(getByText('RemoteLogging.CollectionNoticeWarning')).toBeTruthy()
    expect(getByTestId(testIdWithKey('IAgree'))).toBeTruthy()
    expect(getByTestId(testIdWithKey('TurnOn'))).toBeTruthy()
  })

  it('keeps remote logging off until the user agrees', () => {
    const { getByTestId, onEnablePressed } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey('TurnOn')))

    expect(onEnablePressed).not.toHaveBeenCalled()
  })

  it('enables remote logging once the user agrees and presses turn on', async () => {
    const { getByTestId, onEnablePressed } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey('IAgree')))
    // The Bifold Button flips its own pressing state asynchronously, so the press has to settle
    // inside act or React warns about an unwrapped update.
    await act(async () => {
      fireEvent.press(getByTestId(testIdWithKey('TurnOn')))
    })

    expect(onEnablePressed).toHaveBeenCalledTimes(1)
  })

  it('goes back when the header back button is pressed', async () => {
    const { getByTestId, onBackPressed } = renderScreen()

    await act(async () => {
      fireEvent.press(getByTestId(testIdWithKey('BackButton')))
    })

    expect(onBackPressed).toHaveBeenCalledTimes(1)
  })
})
