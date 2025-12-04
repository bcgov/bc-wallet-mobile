import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import VideoTooLongScreen from '../../src/bcsc-theme/features/verify/send-video/VideoTooLongScreen'

describe('VideoTooLong', () => {
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
        <VideoTooLongScreen navigation={mockNavigation as never} route={{ params: { videoLengthSeconds: 60 } }} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
