import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import PersonCredential from './PersonCredential'

describe('Person Credential Screen', () => {
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
    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <PersonCredential navigation={navigation as never} route={{} as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
