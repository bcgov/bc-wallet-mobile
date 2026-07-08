import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import DualIdentificationRequiredScreen from './DualIdentificationRequiredScreen'

describe('DualIdentificationRequired', () => {
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
        <DualIdentificationRequiredScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('opens the accepted-ID help page when "See accepted ID" is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <DualIdentificationRequiredScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('SeeAcceptedID')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      BCSCScreens.VerifyWebView,
      expect.objectContaining({ url: HelpCentreUrl.ACCEPTED_IDENTITY_DOCUMENTS })
    )
  })
})
