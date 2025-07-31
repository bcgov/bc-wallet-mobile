import { ColorPalette, IColorPalette, INotificationColors, ThemeBuilder } from '@bifold/core'

import Logo from '@assets/img/logo-with-text-dark.svg'
import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'

export const BCSCNotificationColors: INotificationColors = {
  ...NotificationColors,
  info: '#01264C',
  infoBorder: GrayscaleColors.lightGrey,
  infoIcon: '#FCBA19',
  infoText: GrayscaleColors.lightGrey,
}

export const BCSCColorPalette: IColorPalette = {
  ...BCWalletTheme.ColorPalette,
  notification: BCSCNotificationColors,
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
    link: '#FEF0D8',
    unorderedList: GrayscaleColors.white,
    unorderedListModal: GrayscaleColors.white,
    text: '#01264C',
    icon: GrayscaleColors.white,
    headerIcon: GrayscaleColors.white,
    headerText: GrayscaleColors.white,
    buttonText: GrayscaleColors.white,
    tabBarInactive: GrayscaleColors.white,
  },
  semantic: {
    ...BCWalletTheme.ColorPalette.semantic,
    success: '#89CE00',
  },
}

export const BCSCTheme = new ThemeBuilder(BCWalletTheme)
  .setColorPalette(ColorPalette)
  // TextTheme overrides
  .withOverrides((theme) => ({
    TextTheme: {
      headingOne: {
        color: theme.ColorPalette.grayscale.white,
      },
      headingTwo: {
        color: theme.ColorPalette.grayscale.white,
      },
      headingThree: {
        color: theme.ColorPalette.grayscale.white,
      },
      headingFour: {
        color: theme.ColorPalette.grayscale.white,
      },
      normal: {
        color: theme.ColorPalette.grayscale.white,
      },
      bold: {
        color: theme.ColorPalette.grayscale.white,
      },
      label: {
        color: theme.ColorPalette.grayscale.white,
      },
      labelTitle: {
        color: theme.ColorPalette.grayscale.white,
      },
      labelSubtitle: {
        color: theme.ColorPalette.grayscale.white,
      },
      labelText: {
        color: theme.ColorPalette.grayscale.white,
      },
      caption: {
        color: theme.ColorPalette.grayscale.white,
      },
      headerTitle: {
        color: theme.ColorPalette.brand.headerText,
      },
      modalNormal: {
        color: theme.ColorPalette.grayscale.white,
      },
      modalTitle: {
        color: theme.ColorPalette.grayscale.white,
      },
      modalHeadingOne: {
        color: theme.ColorPalette.grayscale.white,
      },
      modalHeadingThree: {
        color: theme.ColorPalette.grayscale.white,
      },
      popupModalText: {
        color: theme.ColorPalette.grayscale.white,
      },
      settingsText: {
        color: theme.ColorPalette.grayscale.white,
      },
    },
  }))
  // NavigationTheme overrides
  .withOverrides((theme) => ({
    NavigationTheme: {
      colors: {
        card: theme.ColorPalette.brand.primaryBackground,
        text: theme.ColorPalette.grayscale.white,
        border: theme.ColorPalette.grayscale.darkGrey,
      },
    },
  }))
  // LoadingTheme overrides
  .withOverrides((theme) => ({
    LoadingTheme: {
      backgroundColor: theme.ColorPalette.brand.primary,
    },
  }))
  // PINInputTheme overrides
  .withOverrides((theme) => ({
    PINInputTheme: {
      cell: {
        backgroundColor: theme.ColorPalette.grayscale.white,
      },
      labelAndFieldContainer: {
        backgroundColor: theme.ColorPalette.grayscale.white,
        borderColor: theme.ColorPalette.grayscale.white,
      },
    },
  }))
  // InputTheme overrides
  .withOverrides((theme) => ({
    Inputs: {
      textInput: {
        backgroundColor: theme.ColorPalette.grayscale.white,
        color: theme.ColorPalette.brand.text,
      },
      inputSelected: {
        backgroundColor: theme.ColorPalette.grayscale.white,
        color: theme.ColorPalette.brand.text,
        borderColor: theme.ColorPalette.grayscale.lightGrey,
      },
      singleSelect: {
        backgroundColor: theme.ColorPalette.brand.secondaryBackground,
      },
      singleSelectIcon: {
        color: theme.ColorPalette.brand.text,
      },
    },
  }))
  // ButtonTheme overrides
  .withOverrides((theme) => ({
    Buttons: {
      primaryText: {
        textAlign: 'center',
      },
      primaryTextDisabled: {
        textAlign: 'center',
      },
      secondaryText: {
        color: theme.ColorPalette.brand.primary,
        textAlign: 'center',
      },
      secondaryTextDisabled: {
        color: theme.ColorPalette.brand.secondaryDisabled,
        textAlign: 'center',
      },
      tertiary: {
        borderRadius: 4,
        borderWidth: 0,
        backgroundColor: theme.ColorPalette.grayscale.white,
      },
      tertiaryDisabled: {
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.ColorPalette.brand.tertiaryDisabled,
      },
      tertiaryText: {
        fontWeight: 'bold',
        color: theme.ColorPalette.brand.text,
      },
      tertiaryTextDisabled: {
        fontWeight: 'bold',
        color: theme.ColorPalette.brand.secondaryDisabled,
      },
      modalPrimaryText: {
        textAlign: 'center',
      },
      modalSecondary: {
        borderColor: theme.ColorPalette.brand.primary,
      },
      modalSecondaryText: {
        textAlign: 'center',
      },
    },
  }))
  // ListItems overrides
  .withOverrides((theme) => ({
    ListItems: {
      contactTitle: {
        color: theme.ColorPalette.grayscale.darkGrey,
      },
      contactDate: {
        color: theme.ColorPalette.grayscale.darkGrey,
      },
      requestTemplateTitle: {
        color: theme.ColorPalette.grayscale.black,
        fontWeight: 'bold',
        fontSize: undefined, // Previously this was not set, so intentionally setting undefined Bifold default: 16
      },
      requestTemplateDetails: {
        color: theme.ColorPalette.grayscale.black,
        fontSize: undefined, // Previously this was not set, so intentionally setting undefined Bifold default: 16
      },
    },
  }))
  // TabTheme overrides
  .withOverrides((theme) => ({
    TabTheme: {
      tabBarStyle: {
        justifyContent: 'space-around',
        backgroundColor: '#252423',
        shadowColor: theme.ColorPalette.grayscale.black,
      },
      tabBarInactiveTintColor: theme.ColorPalette.grayscale.white,
      tabBarTextStyle: {
        ...theme.TabTheme.tabBarTextStyle,
        color: theme.ColorPalette.grayscale.white,
      },
      tabBarButtonIconStyle: {
        color: theme.ColorPalette.brand.primaryBackground,
      },
      tabBarSecondaryBackgroundColor: '#252423',
    },
  }))
  // SettingsTheme overrides
  .withOverrides((theme) => ({
    SettingsTheme: {
      groupHeader: {
        ...theme.TextTheme.normal,
        ...theme.SettingsTheme.groupHeader,
      },
      iconColor: theme.ColorPalette.grayscale.veryLightGrey,
      text: {
        ...theme.TextTheme.caption,
        color: theme.ColorPalette.grayscale.veryLightGrey,
      },
    },
  }))
  // ChatTheme overrides
  .withOverrides((theme) => ({
    ChatTheme: {
      timeStyleLeft: {
        color: theme.ColorPalette.grayscale.white,
      },
      timeStyleRight: {
        color: theme.ColorPalette.grayscale.white,
      },
      leftText: {
        color: theme.ColorPalette.grayscale.white,
      },
      leftTextHighlighted: {
        color: theme.ColorPalette.grayscale.white,
        fontSize: theme.TextTheme.normal.fontSize,
        fontWeight: 'bold',
      },
      rightText: {
        color: theme.ColorPalette.grayscale.white,
        fontSize: theme.TextTheme.normal.fontSize,
      },
      rightTextHighlighted: {
        color: theme.ColorPalette.grayscale.white,
        fontSize: theme.TextTheme.normal.fontSize,
        fontWeight: 'bold',
      },
      inputToolbar: {
        ...theme.ChatTheme.inputToolbar,
      },
      inputText: {
        color: theme.Inputs.textInput.color,
      },
      optionsText: theme.ColorPalette.grayscale.white,
      openButtonTextStyle: {
        color: theme.Buttons.primaryText.color,
        fontSize: theme.TextTheme.normal.fontSize,
      },
      documentIconContainer: {
        alignSelf: 'flex-start',
      },
    },
  }))
  // Assets overrides
  .withOverrides({
    Assets: {
      svg: {
        logo: Logo as React.FC,
      },
    },
  })
  .build()
