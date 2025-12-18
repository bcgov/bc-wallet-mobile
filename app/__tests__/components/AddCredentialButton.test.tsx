import { render } from '@testing-library/react-native'
import React from 'react'

import AddCredentialButton from '@bcwallet-theme/components/AddCredentialButton'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('AddCredentialButton Component', () => {
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
        <AddCredentialButton />
      </BasicAppContext>,
    )
    expect(tree).toMatchSnapshot()
  })
})
