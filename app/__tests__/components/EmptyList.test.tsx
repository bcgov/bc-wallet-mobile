import { render } from '@testing-library/react-native'
import React from 'react'

import EmptyList from '../../src/components/EmptyList'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('EmptyList Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EmptyList />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
