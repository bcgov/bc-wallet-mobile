import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import VideoExpiredScreen from './VideoExpiredScreen'

describe('VideoExpired', () => {
  let mockNavigation: any

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <VideoExpiredScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree).toMatchSnapshot()
  })

  it('sends Retake to the instructions rather than the camera', () => {
    // VideoInstructions sits below TakeVideo, so navigating there pops the camera off and its focus
    // effect issues the next challenge set. Going straight back would re-arm recording against the
    // set the expired recording already answered.
    const tree = renderScreen()

    fireEvent.press(tree.getByText('BCSC.SendVideo.VideoExpired.ButtonText'))

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VideoInstructions)
  })
})
