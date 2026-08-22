import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { AuthSettingsScreen } from './AuthSettingsScreen'

// AuthSettingsScreen is a thin wrapper that hands SettingsContent the Auth stack's callbacks, so the
// rendered tree itself is covered by SettingsContent.test.tsx. Only the stack wiring is asserted here.
describe('AuthSettings', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
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
