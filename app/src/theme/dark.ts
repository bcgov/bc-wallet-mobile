import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text-dark.svg'
import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { IColorPalette, INotificationColors } from '@bifold/core'

import { createAppTheme } from './factory'

const DarkNotificationColors: INotificationColors = {
  ...NotificationColors,
  info: '#01264C',
  infoBorder: GrayscaleColors.lightGrey,
  infoIcon: '#FCBA19',
  infoText: GrayscaleColors.lightGrey,
  error: '#A2312D',
  errorText: GrayscaleColors.white,
  errorBorder: '#A2312D',
  errorIcon: GrayscaleColors.white,
}

const DarkColorPalette: IColorPalette = {
  ...BCWalletTheme.ColorPalette,
  notification: DarkNotificationColors,
  brand: {
    ...BCWalletTheme.ColorPalette.brand,
    primary: '#FCBA19',
    primaryDisabled: `#757575`,
    secondary: GrayscaleColors.white,
    secondaryDisabled: `#757575`,
    tertiary: GrayscaleColors.lightGrey,
    tertiaryDisabled: '#757575',
    primaryLight: '#3470B1',
    highlight: '#FCBA19',
    primaryBackground: '#013366',
    secondaryBackground: '#01264C',
    tertiaryBackground: '#013366',
    modalPrimary: '#FCBA19',
    modalSecondary: '#FCBA19',
    modalTertiary: '#FCBA19',
    modalPrimaryBackground: '#013366',
    modalSecondaryBackground: '#013366',
    modalTertiaryBackground: '#013366',
    modalIcon: '#FCBA19',
    link: '#FCBA19',
    unorderedList: GrayscaleColors.white,
    unorderedListModal: GrayscaleColors.white,
    text: '#01264C',
    icon: GrayscaleColors.white,
    headerIcon: GrayscaleColors.white,
    headerText: GrayscaleColors.white,
    buttonText: GrayscaleColors.white,
    tabBarInactive: GrayscaleColors.white,
    inlineError: '',
    inlineWarning: '',
  },
  semantic: {
    ...BCWalletTheme.ColorPalette.semantic,
    success: '#89CE00',
  },
}

export const DarkTheme = createAppTheme({
  name: BCThemeNames.Dark,
  palette: DarkColorPalette,
  logo: Logo,
  navigationDark: true,
  navigationBorder: GrayscaleColors.darkGrey,
  navigationPrimary: DarkColorPalette.brand.primaryBackground,
  navigationText: DarkColorPalette.brand.secondaryBackground,
  foreground: GrayscaleColors.white,
  foregroundSubtle: GrayscaleColors.veryLightGrey,
  onboardingBodyText: GrayscaleColors.lightGrey,
  textOnWhite: DarkColorPalette.brand.text,
  inlineErrorText: '#FF816B',
  secondaryButton: { backgroundColor: '#1E5189', borderWidth: 0 },
  secondaryButtonText: GrayscaleColors.white,
  tertiaryButtonBackground: GrayscaleColors.white,
  tabBarBackground: '#252423',
  tabBarIcon: DarkColorPalette.brand.primaryBackground,
})
