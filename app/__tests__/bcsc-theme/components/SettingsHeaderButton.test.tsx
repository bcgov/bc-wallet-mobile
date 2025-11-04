import { createSettingsHeaderButton } from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { NavigationContainer } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'

let mockNavigate: jest.Mock

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return {
      navigate: mockNavigate,
    }
  },
}))

describe('SettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the main settings menu button', () => {
    const MainSettingsHeaderButton = createSettingsHeaderButton<BCSCMainStackParams>(BCSCScreens.MainSettings)

    const { getByTestId } = render(
      <NavigationContainer>
        <MainSettingsHeaderButton />
      </NavigationContainer>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to MainSettings screen on press', async () => {
    const MainSettingsHeaderButton = createSettingsHeaderButton<BCSCMainStackParams>(BCSCScreens.MainSettings)

    mockNavigate = jest.fn()

    const { getByTestId } = render(
      <NavigationContainer>
        <MainSettingsHeaderButton />
      </NavigationContainer>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.MainSettings)
  })
})
