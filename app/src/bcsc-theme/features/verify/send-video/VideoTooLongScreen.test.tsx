import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import VideoTooLongScreen from './VideoTooLongScreen'

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
