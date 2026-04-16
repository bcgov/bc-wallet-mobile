import { BCThemeNames } from '@/constants'
import Logo from '@assets/img/logo-with-text.svg'
import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { DeepPartial, IColorPalette, INotificationColors, ITheme, ThemeBuilder } from '@bifold/core'

export const BCSCNotificationColors: INotificationColors = {
  ...NotificationColors,
}

export const BCSCColorPalette: IColorPalette = {
  ...BCWalletTheme.ColorPalette,
  notification: BCSCNotificationColors,
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

const BCSCTextStyles = {
  regular: {
    fontFamily: 'BCSans-Regular',
    fontWeight: 'normal',
  },
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
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        headingTwo: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        headingThree: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        headingFour: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        normal: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
          lineHeight: 30,
        },
        bold: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
          lineHeight: 30,
        },
        label: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelTitle: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        labelSubtitle: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        labelText: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        caption: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        headerTitle: {
          color: theme.ColorPalette.brand.headerText,
          ...BCSCTextStyles.bold,
          fontSize: 18,
        },
        modalNormal: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        modalTitle: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
          fontSize: 28,
        },
        modalHeadingOne: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
          fontWeight: undefined,
        },
        modalHeadingThree: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
          fontWeight: undefined,
        },
        popupModalText: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        settingsText: {
          ...theme.TextTheme.settingsText,
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        inlineErrorText: {
          ...theme.TextTheme.inlineErrorText,
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.notification.errorText,
        },
        inlineWarningText: {
          ...BCSCTextStyles.regular,
          color: theme.ColorPalette.notification.warnText,
        },
        title: {
          ...BCSCTextStyles.regular,
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
          border: theme.ColorPalette.grayscale.lightGrey,
          primary: theme.ColorPalette.brand.primary,
          text: theme.ColorPalette.grayscale.darkGrey,
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
          borderColor: '#7090E4',
        },
        labelAndFieldContainer: {
          backgroundColor: theme.ColorPalette.grayscale.white,
          borderColor: theme.ColorPalette.grayscale.lightGrey,
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
          color: theme.ColorPalette.grayscale.darkGrey,
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
          color: theme.ColorPalette.grayscale.darkGrey,
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
          color: theme.ColorPalette.grayscale.darkGrey,
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
          backgroundColor: theme.ColorPalette.grayscale.white,
          borderWidth: 2,
          borderColor: theme.ColorPalette.brand.primary,
        },
        secondaryText: {
          color: theme.ColorPalette.brand.primary,
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
          backgroundColor: theme.ColorPalette.grayscale.veryLightGrey,
        },
        tertiaryDisabled: {
          borderRadius: 4,
          borderWidth: 2,
          borderColor: theme.ColorPalette.brand.tertiaryDisabled,
        },
        tertiaryText: {
          color: theme.ColorPalette.grayscale.darkGrey,
          ...BCSCTextStyles.bold,
        },
        tertiaryTextDisabled: {
          color: theme.ColorPalette.brand.secondaryDisabled,
          ...BCSCTextStyles.bold,
        },
        modalPrimaryText: {
          textAlign: 'center',
          color: theme.ColorPalette.grayscale.darkGrey,
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
          backgroundColor: theme.ColorPalette.brand.secondaryBackground,
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
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        tabBarButtonIconStyle: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        tabBarSecondaryBackgroundColor: theme.ColorPalette.brand.secondaryBackground,
        tabBarActiveTintColor: theme.ColorPalette.brand.primary,
        tabBarInactiveTintColor: theme.ColorPalette.grayscale.darkGrey,
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
        iconColor: theme.ColorPalette.grayscale.darkGrey,
        text: {
          ...theme.TextTheme.caption,
          color: theme.ColorPalette.grayscale.darkGrey,
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
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        timeStyleRight: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        leftText: {
          color: theme.ColorPalette.grayscale.darkGrey,
        },
        leftTextHighlighted: {
          color: theme.ColorPalette.grayscale.darkGrey,
          fontSize: theme.TextTheme.normal.fontSize,
          fontWeight: 'bold',
          fontFamily: undefined,
        },
        rightText: {
          color: theme.ColorPalette.grayscale.darkGrey,
          fontSize: theme.TextTheme.normal.fontSize,
        },
        rightTextHighlighted: {
          color: theme.ColorPalette.grayscale.darkGrey,
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
        optionsText: theme.ColorPalette.grayscale.darkGrey,
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
