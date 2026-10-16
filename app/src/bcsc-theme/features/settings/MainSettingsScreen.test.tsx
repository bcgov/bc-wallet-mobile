import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCModals, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { MainSettingsScreen } from './MainSettingsScreen'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@/bcsc-theme/contexts/BCSCAccountContext')

const mockUseServerStatus = jest.fn()
jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

// Capture the callbacks MainSettingsScreen wires so we can exercise the server-status guard directly.
let settingsProps: Record<string, () => void>
jest.mock('./SettingsContent', () => ({
  SettingsContent: (props: Record<string, () => void>) => {
    settingsProps = props
    return null
  },
}))

describe('MainSettingsScreen', () => {
  let mockNavigation: any

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <MainSettingsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()
    mockUseServerStatus.mockReturnValue({ isAvailable: true })
    jest.mocked(useBCSCApiClient).mockReturnValue({ endpoints: { accountDevices: 'https://devices.example' } } as never)
  })

  it('navigates to the Contact us WebView when Contact us is triggered', () => {
    renderScreen()

    settingsProps.onContactUs()

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainWebView, {
      url: 'https://id.gov.bc.ca/static/help/contact-us.html?fromapp=1',
      title: 'BCSC.Screens.ContactUs',
    })
  })

  describe('server-status guarded actions', () => {
    it.each([
      ['onAccountDetails', BCSCScreens.AccountDetails],
      ['onEditNickname', BCSCScreens.EditNickname],
      ['onAddDevice', BCSCScreens.TransferAccountQRInformation],
    ])('%s navigates to its destination when IAS is available', (handler, destination) => {
      renderScreen()

      settingsProps[handler]()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(destination)
    })

    it.each(['onAccountDetails', 'onEditNickname', 'onAddDevice'])(
      '%s routes to the outage screen when IAS is down',
      (handler) => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false })
        renderScreen()

        settingsProps[handler]()

        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.ServiceOutage, {})
      }
    )

    it('My devices is not guarded — always opens the webview', () => {
      mockUseServerStatus.mockReturnValue({ isAvailable: false })
      renderScreen()

      settingsProps.onMyDevices()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        BCSCScreens.MainWebView,
        expect.objectContaining({ title: 'BCSC.Screens.ManageDevices' })
      )
    })
  })
})
