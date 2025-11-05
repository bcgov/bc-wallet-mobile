import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import ErrorTextBox from '../../src/components/ErrorTextBox'

describe('ErrorTextBox Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ErrorTextBox>Lorem ipsum sit dolar</ErrorTextBox>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
