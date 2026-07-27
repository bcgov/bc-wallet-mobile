import { createVerifyHelpMenuButton } from '@/bcsc-theme/components/FloatingHelpMenuHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

// RestartVerificationListButton pulls in useLoadingScreen/useVerificationReset/useSecureActions,
// which BasicAppContext doesn't provide; useRestartVerification.test.tsx covers it separately.
jest.mock('@/bcsc-theme/hooks/useRestartVerification', () => ({
  useRestartVerification: () => jest.fn(),
}))

describe('createVerifyHelpMenuButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('offers restart verification and remove account on the "Choose how to verify" config', () => {
    const VerifyHelpMenuButton = createVerifyHelpMenuButton({ showRestartVerification: true })

    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <VerifyHelpMenuButton />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('HelpMenu')))

    expect(getByText('BCSC.HelpMenu.RestartVerification')).toBeTruthy()
    expect(getByTestId(testIdWithKey('RemoveAccount'))).toBeTruthy()
  })

  it('offers remove account without restart verification on the initial verify prompt config', () => {
    const VerifyHelpMenuButton = createVerifyHelpMenuButton()

    const { getByTestId, queryByText } = render(
      <BasicAppContext>
        <VerifyHelpMenuButton />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('HelpMenu')))

    expect(getByTestId(testIdWithKey('RemoveAccount'))).toBeTruthy()
    expect(queryByText('BCSC.HelpMenu.RestartVerification')).toBeNull()
  })

  it('navigates to the remove account confirmation screen and closes the menu when pressed', async () => {
    const VerifyHelpMenuButton = createVerifyHelpMenuButton()
    const navigation = useNavigation()

    const { getByTestId, queryByTestId } = render(
      <BasicAppContext>
        <VerifyHelpMenuButton />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('HelpMenu')))
    fireEvent.press(getByTestId(testIdWithKey('RemoveAccount')))

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyRemoveAccountConfirmation)

    // The row must also close the menu, not just navigate, or the Modal stays presented over the
    // screen it just pushed; closing is async, so assert once the close animation has settled.
    await waitFor(() => expect(queryByTestId(testIdWithKey('RemoveAccount'))).toBeNull())
  })
})
