import { render } from '@testing-library/react-native'
import React from 'react'

import ErrorTextBox from '../../src/components/ErrorTextBox'

describe('ErrorTextBox Component', () => {
  test('renders correctly', () => {
    const tree = render(<ErrorTextBox>Lorem ipsum sit dolar</ErrorTextBox>)
    expect(tree).toMatchSnapshot()
  })
})
