import { render } from '@testing-library/react-native'
import React from 'react'

import LoadingIcon from '../../src/components/LoadingIcon'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('LoadingIcon Component', () => {
  test('renders correctly', () => {
    const size = 50 // arbitrary
    const color = '#333' // arbitrary
    const active = true // arbitrary
    const tree = render(
      <BasicAppContext>
        <LoadingIcon size={size} color={color} active={active} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
