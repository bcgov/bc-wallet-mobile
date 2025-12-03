import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import PhotoInstructionsScreen from '../../src/bcsc-theme/features/verify/PhotoInstructionsScreen'



describe('PhotoInstructions', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <PhotoInstructionsScreen navigation={mockNavigation as never} route={{ key: 'PhotoInstructions', name: 'PhotoInstructions', params: { forLiveCall: true } } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
