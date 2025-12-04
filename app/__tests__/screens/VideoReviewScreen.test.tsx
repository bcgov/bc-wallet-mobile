import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import VideoReviewScreen from '../../src/bcsc-theme/features/verify/send-video/VideoReviewScreen'

describe('VideoReview', () => {
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
    const route = { params: { videoPath: 'file://test.mp4', videoThumbnailPath: 'file://thumbnail.jpg' } }
    const tree = render(
      <BasicAppContext>
        <VideoReviewScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
