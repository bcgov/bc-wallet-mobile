import { HelpCentreUrl } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Linking } from 'react-native'
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

  it('opens the audio/video troubleshooting help externally when Having trouble is pressed', () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never)
    const tree = render(
      <BasicAppContext>
        <VerifyNotCompleteScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('Trouble')))

    expect(openURLSpy).toHaveBeenCalledWith(HelpCentreUrl.AUDIO_VIDEO_TROUBLESHOOTING)

    openURLSpy.mockRestore()
  })
})
