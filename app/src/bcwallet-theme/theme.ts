import {
  ISpacing,
  IBrandColors,
  ISemanticColors,
  INotificationColors,
  IGrayscaleColors,
  IColorPalette,
  bifoldTheme,
  ThemeBuilder,
  ITheme,
  DeepPartial,
} from '@bifold/core'
import React from 'react'

import Logo from '@assets/img/logo-with-text.svg'
import SecurePIN from '@assets/img/secure-pin.svg'
import { BCThemeNames } from '@/constants'

export const maxFontSizeMultiplier = 2
export const borderRadius = 4
export const heavyOpacity = 0.7
export const mediumOpacity = 0.5
export const lightOpacity = 0.35
export const zeroOpacity = 0.0
export const borderWidth = 2

export const Spacing: ISpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
}

export const SemanticColors: ISemanticColors = {
  error: '#D8292F',
  success: '#2E8540',
  focus: '#3399FF',
}

export const NotificationColors: INotificationColors = {
  success: '#DFF0D8',
  successBorder: '#D6E9C6',
  successIcon: '#2D4821',
  successText: '#2D4821',
  info: '#D9EAF7',
  infoBorder: '#B9CEDE',
  infoIcon: '#313132',
  infoText: '#313132',
  warn: '#F9F1C6',
  warnBorder: '#FAEBCC',
  warnIcon: '#6C4A00',
  warnText: '#6C4A00',
  error: '#F2DEDE',
  errorBorder: '#EBCCD1',
  errorIcon: '#A12622',
  errorText: '#A12622',
  popupOverlay: `rgba(0, 0, 0, ${mediumOpacity})`,
}

export const GrayscaleColors: IGrayscaleColors = {
  black: '#000000',
  darkGrey: '#313132',
  mediumGrey: '#606060',
  lightGrey: '#D3D3D3',
  veryLightGrey: '#F2F2F2',
  white: '#FFFFFF',
}

export const BrandColors: IBrandColors = {
  primary: '#003366',
  primaryDisabled: `#757575`,
  secondary: '#FFFFFFFF',
  secondaryDisabled: `#757575`,
  tertiary: GrayscaleColors.mediumGrey,
  tertiaryDisabled: '#757575',
  primaryLight: '#D9EAF7',
  highlight: '#FCBA19',
  primaryBackground: '#F2F2F2',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#003366',
  modalPrimary: '#003366',
  modalSecondary: '#FFFFFFFF',
  modalTertiary: '#FFFFFF',
  modalPrimaryBackground: '#FFFFFF',
  modalSecondaryBackground: '#F2F2F2',
  modalTertiaryBackground: '#FFFFFF',
  modalIcon: GrayscaleColors.darkGrey,
  link: '#1A5A96',
  credentialLink: '#1A5A96',
  unorderedList: GrayscaleColors.darkGrey,
  unorderedListModal: GrayscaleColors.darkGrey,
  text: GrayscaleColors.white,
  icon: GrayscaleColors.white,
  headerIcon: GrayscaleColors.white,
  headerText: GrayscaleColors.white,
  buttonText: GrayscaleColors.white,
  tabBarInactive: GrayscaleColors.white,
  inlineError: '',
  inlineWarning: '',
}

export const ColorPalette: IColorPalette = {
  brand: BrandColors,
  semantic: SemanticColors,
  notification: NotificationColors,
  grayscale: GrayscaleColors,
}

// Using the bifoldTheme as a base, override the specific style properties for the BCWallet theme.
export const BCWalletTheme = new ThemeBuilder(bifoldTheme)
  .setColorPalette(ColorPalette)
  // General overrides
  .withOverrides({
    Spacing: Spacing,
    themeName: BCThemeNames.BCWallet,
    heavyOpacity: heavyOpacity,
    borderRadius: borderRadius,
    borderWidth: borderWidth,
    maxFontSizeMultiplier: maxFontSizeMultiplier,
  })
  // TextTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      TextTheme: {
        headingOne: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        headingTwo: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        headingThree: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        headingFour: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        normal: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        bold: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        label: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelTitle: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelSubtitle: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelText: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        caption: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        title: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.notification.infoText,
        },
        headerTitle: {
          fontSize: 20,
        },
        modalNormal: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        modalTitle: {
          fontSize: 28,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        modalHeadingOne: {
          color: theme.ColorPalette.grayscale.darkGrey,
          fontWeight: undefined,
        },
        modalHeadingThree: {
          color: theme.ColorPalette.grayscale.darkGrey,
          fontWeight: undefined,
        },
        popupModalText: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        settingsText: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        inlineErrorText: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.notification.errorText,
        },
        inlineWarningText: {
          fontFamily: 'BCSans-Regular',
          color: theme.ColorPalette.notification.warnText,
        },
      },
    })
  )
  // Inputs overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      Inputs: {
        textInput: {
          fontFamily: theme.TextTheme.normal.fontFamily,
          backgroundColor: theme.ColorPalette.grayscale.lightGrey,
          color: theme.TextTheme.normal.color,
          borderWidth: 1,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
        },
        singleSelectIcon: {
          color: theme.ColorPalette.brand.text,
        },
        inputSelected: {
          borderColor: theme.TextTheme.normal.color,
        },
      },
    })
  )
  // TabTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      TabTheme: {
        tabBarInactiveTintColor: theme.ColorPalette.notification.infoText,
        tabBarButtonIconStyle: {
          color: theme.ColorPalette.grayscale.white,
        },
      },
    })
  )
  // NavigationTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      NavigationTheme: {
        colors: {
          text: theme.ColorPalette.brand.text,
        },
      },
    })
  )
  // SettingsTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      SettingsTheme: {
        text: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        iconColor: theme.ColorPalette.grayscale.darkGrey,
      },
    })
  )
  // OnboardingTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      OnboardingTheme: {
        headerText: {
          ...theme.TextTheme.headingTwo,
          color: theme.ColorPalette.notification.infoText,
        },
        imageDisplayOptions: {
          fill: theme.ColorPalette.notification.infoText,
        },
        bodyText: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.notification.infoText,
        },
      },
    })
  )
  // LoadingTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      LoadingTheme: {
        backgroundColor: theme.ColorPalette.brand.primary,
      },
    })
  )
  // PINInputTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      PINInputTheme: {
        cell: {
          backgroundColor: theme.ColorPalette.grayscale.lightGrey,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
          borderWidth: undefined, // Bifold default is 1
        },
        focussedCell: {
          borderColor: '#3399FF',
        },
        cellText: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        icon: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelAndFieldContainer: {
          backgroundColor: theme.ColorPalette.grayscale.lightGrey,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
          borderWidth: undefined, // Bifold default is 1
        },
      },
    })
  )
  // Assets overrides
  .withOverrides({
    Assets: {
      svg: {
        logo: Logo as React.FC,
        secureCheck: SecurePIN as React.FC,
      },
      img: {
        logoSecondary: {
          src: require('@assets/img/logo-large.png'),
          height: 120,
          width: 120,
          resizeMode: 'contain',
        },
        logoPrimary: {
          src: require('@assets/img/logo-large-white.png'),
          aspectRatio: undefined,
          height: 170,
          width: 170,
          resizeMode: undefined, // Bifold default is 'contain'
        },
      },
    },
  })
  // CredentialCardShadowTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      CredentialCardShadowTheme: {
        shadowColor: theme.ColorPalette.grayscale.black,
      },
    })
  )
  // Buttons overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      Buttons: {
        critical: {
          backgroundColor: '#D8292F',
        },
        criticalText: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.grayscale.white,
        },
        primaryText: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.brand.text,
        },
        primaryTextDisabled: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.brand.text,
        },
        secondaryText: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.primary,
          fontWeight: 'bold',
        },
        secondaryTextDisabled: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.secondaryDisabled,
          fontWeight: 'bold',
        },
        modalCritical: {
          backgroundColor: '#D8292F',
        },
        modalCriticalText: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.grayscale.white,
        },
        modalPrimary: {
          backgroundColor: theme.ColorPalette.brand.primary,
        },
        modalPrimaryText: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.brand.text,
        },
        modalSecondary: {
          borderColor: theme.ColorPalette.brand.primary,
        },
        modalSecondaryText: {
          ...theme.TextTheme.normal,
          fontWeight: 'bold',
          color: theme.ColorPalette.brand.primary,
        },
        criticalTextDisabled: undefined,
        modalPrimaryDisabled: undefined,
        modalPrimaryTextDisabled: undefined,
        modalCriticalDisabled: undefined,
        modalCriticalTextDisabled: undefined,
        modalSecondaryDisabled: undefined,
        modalSecondaryTextDisabled: undefined,
        modalTertiary: undefined,
        modalTertiaryDisabled: undefined,
        modalTertiaryText: undefined,
        modalTertiaryTextDisabled: undefined,
        tertiary: undefined,
        tertiaryDisabled: undefined,
        tertiaryText: undefined,
        tertiaryTextDisabled: undefined,
      },
    })
  )
  // ListItems overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      ListItems: {
        credentialOfferTitle: {
          ...theme.TextTheme.modalHeadingThree,
          fontWeight: undefined,
        },
        contactTitle: {
          fontFamily: theme.TextTheme.title.fontFamily,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        contactDate: {
          fontFamily: theme.TextTheme.normal.fontFamily,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        contactIcon: {
          color: theme.ColorPalette.brand.text,
        },
        avatarCircle: {
          borderColor: theme.ColorPalette.grayscale.lightGrey,
        },
        requestTemplateDetails: {
          fontSize: undefined,
        },
        requestTemplateTitle: {
          fontSize: undefined,
        },
        requestTemplateDate: {
          fontSize: undefined,
        },
        requestTemplateIcon: {
          fontSize: undefined,
        },
        requestTemplateZkpLabel: {
          fontSize: undefined,
        },
      },
    })
  )
  // ChatTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      ChatTheme: {
        timeStyleLeft: {
          color: theme.ColorPalette.grayscale.black,
        },
        timeStyleRight: {
          color: theme.ColorPalette.grayscale.black,
        },
        leftText: {
          color: theme.ColorPalette.grayscale.black,
        },
        leftTextHighlighted: {
          color: theme.ColorPalette.grayscale.black,
          fontFamily: undefined,
          fontSize: theme.TextTheme.normal.fontSize,
          fontWeight: 'bold',
        },
        rightText: {
          color: theme.ColorPalette.grayscale.black,
        },
        rightTextHighlighted: {
          color: theme.ColorPalette.grayscale.black,
          fontFamily: undefined,
          fontSize: theme.TextTheme.normal.fontSize,
          fontWeight: 'bold',
        },
        inputText: {
          lineHeight: undefined,
          color: theme.ColorPalette.brand.primary,
        },
        openButtonStyle: {
          borderRadius: 32,
          backgroundColor: theme.ColorPalette.brand.primary,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          marginTop: 16,
        },
        openButtonTextStyle: {
          color: theme.ColorPalette.brand.secondary,
        },
        documentIconContainer: {
          backgroundColor: '#1c70bf',
          padding: 4,
          borderRadius: 8,
          marginBottom: 8,
          // These properties are defined in Bifold so overriding them to keep previous styling consistent
          justifyContent: undefined,
          alignItems: undefined,
          width: undefined,
          height: undefined,
        },
      },
    })
  )
  .build()
