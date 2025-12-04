import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import BeforeYouCallScreen from '../../src/bcsc-theme/features/verify/live-call/BeforeYouCallScreen'



describe('BeforeYouCall', () => {
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
        <BeforeYouCallScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
