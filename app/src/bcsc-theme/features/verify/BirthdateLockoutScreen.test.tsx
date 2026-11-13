import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import BirthdateLockoutScreen from './BirthdateLockoutScreen'
import { useBirthdateLockoutViewModel } from './useBirthdateLockoutViewModel'

jest.mock('./useBirthdateLockoutViewModel', () => ({ useBirthdateLockoutViewModel: jest.fn() }))

describe('BirthdateLockoutScreen', () => {
  const handleClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useBirthdateLockoutViewModel).mockReturnValue({ message: 'Try again in about 4 minutes.', handleClose })
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <BirthdateLockoutScreen navigation={{} as never} />
      </BasicAppContext>
    )

  it('renders the ViewModel message', () => {
    const { getByTestId } = renderScreen()

    expect(getByTestId(testIdWithKey(TestIds.verify.birthdateLockout.message))).toHaveTextContent(
      'Try again in about 4 minutes.'
    )
  })

  it('calls the ViewModel close handler', () => {
    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey(TestIds.verify.birthdateLockout.close)))

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
