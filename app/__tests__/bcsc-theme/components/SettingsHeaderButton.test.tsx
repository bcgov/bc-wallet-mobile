import {
  createMainSettingsHeaderButton,
  createVerifySettingsHeaderButton,
} from '@/bcsc-theme/components/SettingsHeaderButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'

describe('MainSettingsHeaderButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders the main settings menu button', () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()

    const { getByTestId } = render(<MainSettingsHeaderButton />)

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to MainSettings screen on press', async () => {
    const MainSettingsHeaderButton = createMainSettingsHeaderButton()
    const navigation = useNavigation()

    const { getByTestId } = render(<MainSettingsHeaderButton />)

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

    const { getByTestId } = render(<VerifySettingsHeaderButton />)

    expect(getByTestId(testIdWithKey('SettingsMenuButton'))).toBeTruthy()
  })

  it('should navigate to VerifySettings screen on press', async () => {
    const VerifySettingsHeaderButton = createVerifySettingsHeaderButton()
    const navigation = useNavigation()

    const { getByTestId } = render(<VerifySettingsHeaderButton />)

    const button = getByTestId(testIdWithKey('SettingsMenuButton'))

    fireEvent.press(button)

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifySettings)
  })
})
