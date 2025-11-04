import {
  createMainSettingsHeaderButton,
  createVerifySettingsHeaderButton,
} from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
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

describe('MainSettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the main settings menu button', () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()

    const { getByTestId } = render(
      <NavigationContainer>
        <MainSettingsHeaderButton />
      </NavigationContainer>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to MainSettings screen on press', async () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()

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

describe('VerifySettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the verify settings menu button', () => {
    const VerifySettingsHeaderButton = createVerifySettingsHeaderButton()

    const { getByTestId } = render(
      <NavigationContainer>
        <VerifySettingsHeaderButton />
      </NavigationContainer>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to VerifySettings screen on press', async () => {
    const VerifySettingsHeaderButton = createVerifySettingsHeaderButton()

    mockNavigate = jest.fn()

    const { getByTestId } = render(
      <NavigationContainer>
        <VerifySettingsHeaderButton />
      </NavigationContainer>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.VerifySettings)
  })
})
