import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import NonProdOverlay from './NonProdOverlay'

describe('NonProdOverlay Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <NonProdOverlay />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
