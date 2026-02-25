import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import BeforeYouCallScreen from './BeforeYouCallScreen'

describe('BeforeYouCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BeforeYouCallScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('navigates to ContactUs when Assistance is pressed', () => {
    const tree = render(
      <BasicAppContext>
        <BeforeYouCallScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('Assistance')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyContactUs)
  })
})
