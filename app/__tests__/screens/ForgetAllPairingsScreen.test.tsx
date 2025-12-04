import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ForgetAllPairingsScreen } from '../../src/bcsc-theme/features/settings/ForgetAllPairingsScreen'

describe('ForgetAllPairings', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ForgetAllPairingsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
