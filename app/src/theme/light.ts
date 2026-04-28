import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text.svg'
import { GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'

import { createAppTheme } from './factory'

const BC_BLUE = '#003366'
const LIGHT_GREY_BG = '#F2F2F2'
const BC_BLUE_LINK = '#1A5A96'
const OFF_WHITE = '#F7F9FC' // QUESTION (MD): Is this also the value for LIGHT_GREY_BG?

export const LightTheme = createAppTheme({
  name: BCThemeNames.Light,
  logo: Logo,
  primary: BC_BLUE,
  primaryBackground: GrayscaleColors.white,
  secondaryBackground: GrayscaleColors.white,
  tertiaryBackground: BC_BLUE,
  modalPrimaryBackground: GrayscaleColors.white,
  modalSecondaryBackground: LIGHT_GREY_BG,
  modalTertiaryBackground: GrayscaleColors.white,
  link: BC_BLUE_LINK,
  unorderedList: GrayscaleColors.darkGrey,
  unorderedListModal: GrayscaleColors.darkGrey,
  text: GrayscaleColors.white,
  icon: GrayscaleColors.darkGrey,
  headerIcon: GrayscaleColors.darkGrey,
  headerText: GrayscaleColors.darkGrey,
  tabBarInactive: GrayscaleColors.darkGrey,
  navigationDark: false,
  navigationBorder: GrayscaleColors.lightGrey,
  navigationPrimary: BC_BLUE,
  navigationText: GrayscaleColors.darkGrey,
  foreground: GrayscaleColors.darkGrey,
  foregroundSubtle: GrayscaleColors.darkGrey,
  onboardingBodyText: GrayscaleColors.darkGrey,
  textOnWhite: GrayscaleColors.darkGrey,
  inlineErrorText: NotificationColors.errorText,
  secondaryButton: {
    backgroundColor: GrayscaleColors.white,
    borderWidth: 2,
    borderColor: BC_BLUE,
  },
  secondaryButtonText: BC_BLUE,
  tertiaryButtonBackground: GrayscaleColors.veryLightGrey,
  tabBarBackground: GrayscaleColors.white,
  tabBarIcon: GrayscaleColors.darkGrey,
  notification: {
    info: OFF_WHITE,
    infoBorder: '#053662',
  },
})
