import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { AccountSecurityMethod } from 'react-native-bcsc-core'
import { VerifySettingsScreen } from './VerifySettingsScreen'

// A PIN account, so the authenticated snapshot keeps the Change PIN row.
const authenticatedState = {
  authentication: { didAuthenticate: true },
  bcscSecure: { securityMethod: AccountSecurityMethod.PinWithDeviceAuth },
} as never

// The authenticated section reads the OS notification permission after mount; flush it so the update lands inside act.
const flushNotificationStatus = () => act(async () => {})

describe('VerifySettings', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly when unauthenticated', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly when authenticated', async () => {
    const tree = render(
      <BasicAppContext initialStateOverride={authenticatedState}>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
    await flushNotificationStatus()
  })

  it('renders the remove account option', async () => {
    const { getByTestId } = render(
      <BasicAppContext initialStateOverride={authenticatedState}>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('RemoveAccount'))).toBeTruthy()
    await flushNotificationStatus()
  })

  it('navigates to remove account confirmation when remove account is pressed', async () => {
    const { getByTestId } = render(
      <BasicAppContext initialStateOverride={authenticatedState}>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('RemoveAccount')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyRemoveAccountConfirmation)
    await flushNotificationStatus()
  })

  it('navigates to the Contact us WebView when Contact us is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('ContactUs')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyWebView, {
      url: 'https://id.gov.bc.ca/static/help/contact-us.html?fromapp=1',
      title: 'BCSC.Screens.ContactUs',
    })
  })
})
