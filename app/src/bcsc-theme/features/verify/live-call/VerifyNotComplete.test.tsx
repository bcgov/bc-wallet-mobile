import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import VerifyNotCompleteScreen from './VerifyNotComplete'

describe('VerifyNotComplete', () => {
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
        <VerifyNotCompleteScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('navigates to VerifyWebView with audio/video troubleshooting help when Having trouble is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <VerifyNotCompleteScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('Trouble')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyWebView, {
      url: HelpCentreUrl.AUDIO_VIDEO_TROUBLESHOOTING,
      title: expect.any(String),
    })
  })
})
