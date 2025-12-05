import {
  createMainSettingsHeaderButton,
  createVerifySettingsHeaderButton,
} from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import { BasicAppContext } from '../../../__mocks__/helpers/app'

// Mock useNavigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native')
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
    })),
  }
})

import { useNavigation } from '@react-navigation/native'

describe('MainSettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the main settings menu button', () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()

    const { getByTestId } = render(
      <BasicAppContext>
        <MainSettingsHeaderButton />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to MainSettings screen on press', async () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()
    const mockNavigate = jest.fn()
    ;(useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    })

    const { getByTestId } = render(
      <BasicAppContext>
        <MainSettingsHeaderButton />
      </BasicAppContext>
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
      <BasicAppContext>
        <VerifySettingsHeaderButton />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to VerifySettings screen on press', async () => {
    const VerifySettingsHeaderButton = createVerifySettingsHeaderButton()
    const mockNavigate = jest.fn()
    ;(useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    })

    const { getByTestId } = render(
      <BasicAppContext>
        <VerifySettingsHeaderButton />
      </BasicAppContext>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))
    fireEvent.press(button)

    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.VerifySettings)
  })
})
