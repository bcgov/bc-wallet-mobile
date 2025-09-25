import { createSettingsHeaderButton } from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { NavigationContainer } from '@react-navigation/native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { BasicAppContext } from '__mocks__/helpers/app'

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

  it('renders the settings menu button', () => {
    const SettingsHeaderButton = createSettingsHeaderButton()

    const { getByTestId } = render(
      <NavigationContainer>
        <SettingsHeaderButton />
      </NavigationContainer>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to Settings screen on press', async () => {
    const SettingsHeaderButton = createSettingsHeaderButton()

    mockNavigate = jest.fn()

    const { getByTestId } = render(
      <NavigationContainer>
        <SettingsHeaderButton />
      </NavigationContainer>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.Settings)
  })
})
