import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { AuthSettingsScreen } from './AuthSettingsScreen'

describe('AuthSettings', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <AuthSettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('navigates to the Contact us WebView when Contact us is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <AuthSettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('ContactUs')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AuthWebView, {
      url: 'https://id.gov.bc.ca/static/help/contact-us.html?fromapp=1',
      title: 'BCSC.Screens.ContactUs',
    })
  })
})
