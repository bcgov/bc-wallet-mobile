import { render } from '@testing-library/react-native'
import React from 'react'

import AddCredentialButton from '../../src/components/AddCredentialButton'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('AddCredentialButton Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AddCredentialButton />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
