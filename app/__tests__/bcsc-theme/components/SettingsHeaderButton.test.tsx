import {
  createAuthSettingsHeaderButton,
  createMainSettingsHeaderButton,
  createVerifySettingsHeaderButton,
} from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import { BasicAppContext } from '../../../__mocks__/helpers/app'

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
    const navigation = useNavigation()

    const { getByTestId } = render(
      <BasicAppContext>
        <MainSettingsHeaderButton />
      </BasicAppContext>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.MainSettings)
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
    const navigation = useNavigation()

    const { getByTestId } = render(
      <BasicAppContext>
        <VerifySettingsHeaderButton />
      </BasicAppContext>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifySettings)
  })
})

describe('AuthSettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the auth settings menu button', () => {
    const AuthSettingsHeaderButton = createAuthSettingsHeaderButton()

    const { getByTestId } = render(
      <BasicAppContext>
        <AuthSettingsHeaderButton />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to AuthSettings screen on press', async () => {
    const AuthSettingsHeaderButton = createAuthSettingsHeaderButton()
    const navigation = useNavigation()

    const { getByTestId } = render(
      <BasicAppContext>
        <AuthSettingsHeaderButton />
      </BasicAppContext>
    )

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.AuthSettings)
  })
})
