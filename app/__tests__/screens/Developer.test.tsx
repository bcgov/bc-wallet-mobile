import { AuthProvider } from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import Developer from '../../src/screens/Developer'

describe('Developer Screen', () => {
  beforeEach(() => {
    // Silence console.error because it will print a warning about Switch
    // "Warning: dispatchCommand was called with a ref ...".
    jest.spyOn(console, 'error').mockImplementation(() => {
      return null
    })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AuthProvider>
          <Developer />
        </AuthProvider>
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
