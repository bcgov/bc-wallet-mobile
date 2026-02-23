import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import RemoveAccountConfirmationScreen from './RemoveAccountConfirmationScreen'

describe('RemoveAccountConfirmation', () => {
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
        <RemoveAccountConfirmationScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
