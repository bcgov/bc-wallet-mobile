import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import ErrorTextBox from './ErrorTextBox'

describe('ErrorTextBox Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ErrorTextBox>Lorem ipsum sit dolar</ErrorTextBox>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
