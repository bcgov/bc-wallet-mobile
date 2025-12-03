import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import CallBusyOrClosedScreen from '../../src/bcsc-theme/features/verify/live-call/CallBusyOrClosedScreen'



describe('CallBusyOrClosed', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <CallBusyOrClosedScreen navigation={mockNavigation as never} route={{ params: {} } as never}/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
