import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text-dark.svg'
import { GrayscaleColors } from '@bcwallet-theme/theme'

import { createAppTheme } from './factory'

const DARK_BLUE = '#013366'
const DARK_NAVY = '#01264C'
const GOLD = '#FCBA19'

export const DarkTheme = createAppTheme({
  name: BCThemeNames.Dark,
  logo: Logo,
  primary: GOLD,
  primaryBackground: DARK_BLUE,
  secondaryBackground: DARK_NAVY,
  tertiaryBackground: DARK_BLUE,
  modalPrimaryBackground: DARK_BLUE,
  modalSecondaryBackground: DARK_BLUE,
  modalTertiaryBackground: DARK_BLUE,
  link: GOLD,
  unorderedList: GrayscaleColors.white,
  unorderedListModal: GrayscaleColors.white,
  text: DARK_NAVY,
  icon: GrayscaleColors.white,
  headerIcon: GrayscaleColors.white,
  headerText: GrayscaleColors.white,
  tabBarInactive: GrayscaleColors.white,
  notification: {
    info: DARK_NAVY,
    infoBorder: GrayscaleColors.lightGrey,
    infoIcon: GOLD,
    infoText: GrayscaleColors.lightGrey,
    error: '#A2312D',
    errorText: GrayscaleColors.white,
    errorBorder: '#A2312D',
    errorIcon: GrayscaleColors.white,
  },
  navigationDark: true,
  navigationBorder: GrayscaleColors.darkGrey,
  navigationPrimary: DARK_BLUE,
  navigationText: DARK_NAVY,
  foreground: GrayscaleColors.white,
  foregroundHeading: GrayscaleColors.white,
  foregroundSubtle: GrayscaleColors.veryLightGrey,
  onboardingBodyText: GrayscaleColors.lightGrey,
  textOnWhite: DARK_NAVY,
  inlineErrorText: '#FF816B',
  secondaryButton: { backgroundColor: '#1E5189', borderWidth: 0 },
  secondaryButtonText: GrayscaleColors.white,
  tertiaryButtonBackground: GrayscaleColors.white,
  tabBarBackground: '#252423',
  tabBarIcon: DARK_BLUE,
})
