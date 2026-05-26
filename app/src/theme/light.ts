import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text.svg'
import { GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'

import { createAppTheme } from './factory'

const BC_BLUE = '#003366'
const LIGHT_GREY_BG = '#F2F2F2'
const BC_BLUE_LINK = '#1A5A96'
const OFF_WHITE = '#F7F9FC' 
const HEADING_TEXT_BLUE = '#1E5189'
const LIGHT_BLUE_BG = '#D8EAFD'
const PRIMARY_LIGHT = '#D9EAF7'

export const LightTheme = createAppTheme({
  name: BCThemeNames.Light,
  logo: Logo,
  primary: BC_BLUE,
  primaryLight: PRIMARY_LIGHT,
  primaryBackground: GrayscaleColors.white,
  secondaryBackground: GrayscaleColors.white,
  tertiaryBackground: LIGHT_BLUE_BG,
  modalPrimaryBackground: GrayscaleColors.white,
  modalSecondaryBackground: LIGHT_GREY_BG,
  modalTertiaryBackground: OFF_WHITE,
  link: BC_BLUE_LINK,
  unorderedList: GrayscaleColors.darkGrey,
  unorderedListModal: GrayscaleColors.darkGrey,
  text: GrayscaleColors.white,
  icon: GrayscaleColors.darkGrey,
  headerIcon: GrayscaleColors.darkGrey,
  headerText: HEADING_TEXT_BLUE,
  tabBarInactive: GrayscaleColors.darkGrey,
  navigationDark: false,
  navigationBorder: GrayscaleColors.lightGrey,
  navigationPrimary: BC_BLUE,
  navigationText: GrayscaleColors.darkGrey,
  foreground: GrayscaleColors.darkGrey,
  foregroundHeading: HEADING_TEXT_BLUE,
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
  pinInputBorder: '#AAAAAA',
  pinInputBackground: '#F8F8F8',
  notification: {
    success: '#E6F4EA',
    successBorder: '#2E7D32',
    info: LIGHT_BLUE_BG,
    infoBorder: '#053662',
    warn: '#FFF4D6',
    warnBorder: '#FCBA19',
    error: '#FDEAEA',
    errorBorder: '#D8292F',
  },
})
