import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text.svg'
import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { IColorPalette, INotificationColors } from '@bifold/core'

import { createAppTheme } from './factory'

const LightNotificationColors: INotificationColors = {
  ...NotificationColors,
}

const LightColorPalette: IColorPalette = {
  ...BCWalletTheme.ColorPalette,
  notification: LightNotificationColors,
  brand: {
    ...BCWalletTheme.ColorPalette.brand,
    primary: '#003366',
    primaryDisabled: `#757575`,
    secondary: GrayscaleColors.white,
    secondaryDisabled: `#757575`,
    tertiary: GrayscaleColors.lightGrey,
    tertiaryDisabled: '#757575',
    primaryLight: '#3470B1',
    highlight: '#FCBA19',
    primaryBackground: '#F2F2F2',
    secondaryBackground: '#FFFFFF',
    tertiaryBackground: '#003366',
    modalPrimary: '#FCBA19',
    modalSecondary: '#FCBA19',
    modalTertiary: '#FCBA19',
    modalPrimaryBackground: '#FFFFFF',
    modalSecondaryBackground: '#F2F2F2',
    modalTertiaryBackground: '#FFFFFF',
    modalIcon: '#FCBA19',
    link: '#1A5A96',
    unorderedList: GrayscaleColors.darkGrey,
    unorderedListModal: GrayscaleColors.darkGrey,
    text: GrayscaleColors.white,
    icon: GrayscaleColors.darkGrey,
    headerIcon: GrayscaleColors.darkGrey,
    headerText: GrayscaleColors.darkGrey,
    buttonText: GrayscaleColors.white,
    tabBarInactive: GrayscaleColors.darkGrey,
    inlineError: '',
    inlineWarning: '',
  },
  semantic: {
    ...BCWalletTheme.ColorPalette.semantic,
    success: '#89CE00',
  },
}

export const LightTheme = createAppTheme({
  name: BCThemeNames.Light,
  palette: LightColorPalette,
  logo: Logo,
  navigationDark: false,
  navigationBorder: GrayscaleColors.lightGrey,
  navigationPrimary: LightColorPalette.brand.primary,
  navigationText: GrayscaleColors.darkGrey,
  foreground: GrayscaleColors.darkGrey,
  foregroundSubtle: GrayscaleColors.darkGrey,
  onboardingBodyText: GrayscaleColors.darkGrey,
  textOnWhite: GrayscaleColors.darkGrey,
  inlineErrorText: LightNotificationColors.errorText,
  secondaryButton: {
    backgroundColor: GrayscaleColors.white,
    borderWidth: 2,
    borderColor: LightColorPalette.brand.primary,
  },
  secondaryButtonText: LightColorPalette.brand.primary,
  tertiaryButtonBackground: GrayscaleColors.veryLightGrey,
  tabBarBackground: LightColorPalette.brand.secondaryBackground,
  tabBarIcon: GrayscaleColors.darkGrey,
})
