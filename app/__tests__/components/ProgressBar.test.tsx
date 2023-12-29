import { render } from '@testing-library/react-native'
import React from 'react'

import ProgressBar from '../../src/components/ProgressBar'

describe('ProgressBar Component', () => {
  test('renders correctly', () => {
    const tree = render(<ProgressBar progressPercent={0} />)
    expect(tree).toMatchSnapshot()
  })
})
