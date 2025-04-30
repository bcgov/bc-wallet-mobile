import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import PersonCredential from '../../src/bcwallet-theme/features/person-flow/screens/PersonCredential'

const mockNavigation = jest.fn()
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return mockNavigation
  },
}))

describe('Person Credential Screen', () => {
  beforeEach(() => {
    // Silence console.error because it will print a warning about Switch
    // "Warning: dispatchCommand was called with a ref ...".
    jest.spyOn(console, 'error').mockImplementation(() => {
      return null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('screen renders correctly', () => {
    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <PersonCredential navigation={navigation as never} route={{} as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
