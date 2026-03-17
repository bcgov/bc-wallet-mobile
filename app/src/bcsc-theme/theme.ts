import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text-dark.svg'
import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { DeepPartial, IColorPalette, INotificationColors, ITheme, ThemeBuilder } from '@bifold/core'

export const BCSCNotificationColors: INotificationColors = {
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

const BCSCTextStyles = {
  bold: {
    fontFamily: 'BCSans-Bold',
    fontWeight: 'normal', // Font won't render without this property
  },
} as const

export const BCSCTheme = new ThemeBuilder(BCWalletTheme)
  .setColorPalette(BCSCColorPalette)
  .withOverrides({
    themeName: BCThemeNames.BCSC,
  })
  // TextTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      TextTheme: {
        headingOne: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
        },
        headingTwo: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
        },
        headingThree: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
        },
        headingFour: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
        },
        normal: {
          color: theme.ColorPalette.grayscale.white,
          lineHeight: 30,
        },
        bold: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
          lineHeight: 30,
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
          ...BCSCTextStyles.bold,
          fontSize: 18,
        },
        modalNormal: {
          color: theme.ColorPalette.grayscale.white,
        },
        modalTitle: {
          color: theme.ColorPalette.grayscale.white,
          fontSize: 28,
        },
        modalHeadingOne: {
          color: theme.ColorPalette.grayscale.white,
          fontWeight: undefined,
        },
        modalHeadingThree: {
          color: theme.ColorPalette.grayscale.white,
          fontWeight: undefined,
        },
        popupModalText: {
          color: theme.ColorPalette.grayscale.white,
        },
        settingsText: {
          ...theme.TextTheme.settingsText,
          color: theme.ColorPalette.grayscale.white,
        },
        inlineErrorText: {
          ...theme.TextTheme.inlineErrorText,
          color: '#FF816B',
        },
        inlineWarningText: {
          color: theme.ColorPalette.notification.warnText,
        },
        title: {
          color: theme.ColorPalette.notification.infoText,
        },
      },
    })
  )
  // NavigationTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      NavigationTheme: {
        colors: {
          card: theme.ColorPalette.brand.primaryBackground,
          border: theme.ColorPalette.grayscale.darkGrey,
          primary: theme.ColorPalette.brand.primaryBackground,
          text: theme.ColorPalette.brand.secondaryBackground,
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
          backgroundColor: theme.ColorPalette.grayscale.white,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
          borderWidth: undefined,
        },
        focussedCell: {
          borderColor: '#3399FF',
        },
        labelAndFieldContainer: {
          backgroundColor: theme.ColorPalette.grayscale.white,
          borderColor: theme.ColorPalette.grayscale.white,
          borderWidth: undefined,
        },
        cellText: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        icon: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
      },
    })
  )
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      OnboardingTheme: {
        bodyText: {
          color: theme.ColorPalette.grayscale.lightGrey,
        },
        headerText: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.notification.infoText,
          fontSize: 32,
          fontWeight: 'bold',
        },
        imageDisplayOptions: {
          fill: theme.ColorPalette.notification.infoText,
        },
      },
    })
  )
  // InputTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      Inputs: {
        textInput: {
          backgroundColor: theme.ColorPalette.grayscale.white,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
          color: theme.ColorPalette.brand.text,
          borderWidth: 1,
          margin: 1, // borderWidth + margin should equal 2 to prevent layout shift on focus
        },
        inputSelected: {
          borderColor: '#7090E4',
          borderWidth: 2,
          margin: 0, // borderWidth + margin should equal 2 to prevent layout shift on focus
          backgroundColor: theme.ColorPalette.grayscale.white,
          shadowColor: '#7090E4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 4,
        },
        singleSelect: {
          backgroundColor: theme.ColorPalette.brand.secondaryBackground,
        },
        singleSelectIcon: {
          color: theme.ColorPalette.brand.text,
        },
      },
    })
  )
  // ButtonTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      Buttons: {
        critical: {
          backgroundColor: theme.ColorPalette.semantic.error,
        },
        primaryText: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.text,
          ...BCSCTextStyles.bold,
          textAlign: 'center',
        },
        primaryTextDisabled: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.text,
          ...BCSCTextStyles.bold,
          textAlign: 'center',
        },
        secondary: {
          backgroundColor: '#1E5189',
          borderWidth: 0,
        },
        secondaryText: {
          color: theme.ColorPalette.grayscale.white,
          ...BCSCTextStyles.bold,
          textAlign: 'center',
        },
        secondaryTextDisabled: {
          color: theme.ColorPalette.brand.secondaryDisabled,
          ...BCSCTextStyles.bold,
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
          color: theme.ColorPalette.brand.text,
          ...BCSCTextStyles.bold,
        },
        tertiaryTextDisabled: {
          color: theme.ColorPalette.brand.secondaryDisabled,
          ...BCSCTextStyles.bold,
        },
        modalPrimaryText: {
          textAlign: 'center',
          color: theme.ColorPalette.brand.text,
        },
        modalSecondary: {
          borderColor: theme.ColorPalette.brand.primary,
        },
        modalSecondaryText: {
          textAlign: 'center',
        },
        modalCritical: {
          backgroundColor: theme.ColorPalette.semantic.error,
        },
        criticalTextDisabled: undefined,
        modalCriticalDisabled: undefined,
        modalCriticalTextDisabled: undefined,
        modalPrimaryDisabled: undefined,
        modalSecondaryDisabled: undefined,
        modalSecondaryTextDisabled: undefined,
        modalTertiary: undefined,
        modalTertiaryDisabled: undefined,
        modalTertiaryText: undefined,
        modalTertiaryTextDisabled: undefined,
        modalPrimaryTextDisabled: undefined,
      },
    })
  )
  // ListItems overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      ListItems: {
        avatarCircle: {
          borderColor: theme.ColorPalette.grayscale.lightGrey,
        },
        contactTitle: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        contactDate: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        contactIcon: {
          color: theme.ColorPalette.brand.secondaryBackground,
        },
        credentialOfferTitle: {
          fontWeight: undefined,
        },
        requestTemplateTitle: {
          color: theme.ColorPalette.grayscale.black,
          fontWeight: 'bold',
          fontSize: undefined,
        },
        requestTemplateDetails: {
          color: theme.ColorPalette.grayscale.black,
          fontSize: undefined, // Previously this was not set, so intentionally setting undefined Bifold default: 16
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
  // TabTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      TabTheme: {
        tabBarStyle: {
          justifyContent: 'space-around',
          backgroundColor: '#252423',
          shadowColor: theme.ColorPalette.grayscale.black,
        },
        focusTabIconStyle: {
          backgroundColor: theme.ColorPalette.brand.primary,
        },
        focusTabActiveTintColor: {
          backgroundColor: theme.ColorPalette.brand.secondary,
        },
        tabBarTextStyle: {
          ...theme.TabTheme.tabBarTextStyle,
          color: theme.ColorPalette.grayscale.white,
        },
        tabBarButtonIconStyle: {
          color: theme.ColorPalette.brand.primaryBackground,
        },
        tabBarSecondaryBackgroundColor: '#252423',
        tabBarActiveTintColor: theme.ColorPalette.brand.primary,
        tabBarInactiveTintColor: theme.ColorPalette.grayscale.white,
      },
    })
  )
  // SettingsTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      SettingsTheme: {
        groupHeader: {
          ...theme.TextTheme.normal,
          ...theme.SettingsTheme.groupHeader,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        iconColor: theme.ColorPalette.grayscale.veryLightGrey,
        text: {
          ...theme.TextTheme.caption,
          color: theme.ColorPalette.grayscale.veryLightGrey,
        },
        groupBackground: theme.ColorPalette.brand.secondaryBackground,
      },
    })
  )
  // ChatTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
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
          fontFamily: undefined,
        },
        rightText: {
          color: theme.ColorPalette.grayscale.white,
          fontSize: theme.TextTheme.normal.fontSize,
        },
        rightTextHighlighted: {
          color: theme.ColorPalette.grayscale.white,
          fontSize: theme.TextTheme.normal.fontSize,
          fontWeight: 'bold',
          fontFamily: undefined,
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
          backgroundColor: '#1c70bf',
          alignSelf: 'flex-start',
          padding: 4,
          borderRadius: 8,
          marginBottom: 8,
          height: undefined,
          width: undefined,
          justifyContent: undefined,
          alignItems: undefined,
        },
      },
    })
  )
  // HomeTheme overrides
  .withOverrides(
    (theme): DeepPartial<ITheme> => ({
      HomeTheme: {
        noNewUpdatesText: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.notification.infoText,
        },
        link: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.link,
        },
      },
    })
  )
  // Assets overrides
  .withOverrides({
    Assets: {
      svg: {
        logo: Logo as React.FC,
      },
    },
  })
  .build()
