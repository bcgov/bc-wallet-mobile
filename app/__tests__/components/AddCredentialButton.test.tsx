import { render } from '@testing-library/react-native'
import React from 'react'

import AddCredentialButton from '../../src/components/AddCredentialButton'

describe('AddCredentialButton Component', () => {
  test('renders correctly', () => {
    const tree = render(<AddCredentialButton />)
    expect(tree).toMatchSnapshot()
  })
})
