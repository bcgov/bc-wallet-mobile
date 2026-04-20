import { BCWalletTheme, GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { DeepPartial, IColorPalette, INotificationColors, ITheme, ThemeBuilder } from '@bifold/core'

import { ThemeTextStyles } from './text-styles'

interface SecondaryButtonStyle {
  backgroundColor: string
  borderWidth: number
  borderColor?: string
}

/** Palette values that vary between variants. Everything else is shared defaults. */
interface PaletteSpec {
  primary: string
  primaryBackground: string
  secondaryBackground: string
  tertiaryBackground: string
  modalPrimaryBackground: string
  modalSecondaryBackground: string
  modalTertiaryBackground: string
  link: string
  unorderedList: string
  unorderedListModal: string
  text: string
  icon: string
  headerIcon: string
  headerText: string
  tabBarInactive: string
  notification?: Partial<INotificationColors>
}

/**
 * Everything that differs between the app's theme variants (Light, Dark, and any
 * future ones). Keeps {@link createAppTheme} fully data-driven.
 */
export interface ThemeVariant extends PaletteSpec {
  name: string
  logo: React.FC

  /** React Navigation `theme.dark` flag. Drives RN's default header/contrast decisions. */
  navigationDark: boolean
  /** Colours for React Navigation's theme object. */
  navigationBorder: string
  navigationPrimary: string
  navigationText: string

  /** Main text colour on `brand.primaryBackground`. */
  foreground: string
  /** Subtle text/icon colour for settings rows and captions. */
  foregroundSubtle: string
  /** OnboardingTheme body text colour. */
  onboardingBodyText: string
  /** Dark body text colour used on white surfaces (inputs, tertiary/modal buttons). */
  textOnWhite: string
  /** Inline error text colour. */
  inlineErrorText: string

  /** Secondary button container style (background, border). */
  secondaryButton: SecondaryButtonStyle
  secondaryButtonText: string
  /** Tertiary button background colour. */
  tertiaryButtonBackground: string

  /** Tab bar background + button icon colours. */
  tabBarBackground: string
  tabBarIcon: string
}

function buildPalette(spec: PaletteSpec): IColorPalette {
  return {
    ...BCWalletTheme.ColorPalette,
    notification: { ...NotificationColors, ...spec.notification },
    brand: {
      ...BCWalletTheme.ColorPalette.brand,
      primary: spec.primary,
      primaryDisabled: '#757575',
      secondary: GrayscaleColors.white,
      secondaryDisabled: '#757575',
      tertiary: GrayscaleColors.lightGrey,
      tertiaryDisabled: '#757575',
      primaryLight: '#3470B1',
      highlight: '#FCBA19',
      primaryBackground: spec.primaryBackground,
      secondaryBackground: spec.secondaryBackground,
      tertiaryBackground: spec.tertiaryBackground,
      modalPrimary: '#FCBA19',
      modalSecondary: '#FCBA19',
      modalTertiary: '#FCBA19',
      modalPrimaryBackground: spec.modalPrimaryBackground,
      modalSecondaryBackground: spec.modalSecondaryBackground,
      modalTertiaryBackground: spec.modalTertiaryBackground,
      modalIcon: '#FCBA19',
      link: spec.link,
      unorderedList: spec.unorderedList,
      unorderedListModal: spec.unorderedListModal,
      text: spec.text,
      icon: spec.icon,
      headerIcon: spec.headerIcon,
      headerText: spec.headerText,
      buttonText: GrayscaleColors.white,
      tabBarInactive: spec.tabBarInactive,
      inlineError: '',
      inlineWarning: '',
    },
    semantic: {
      ...BCWalletTheme.ColorPalette.semantic,
      success: '#89CE00',
    },
  }
}

export function createAppTheme(v: ThemeVariant) {
  return new ThemeBuilder(BCWalletTheme)
    .setColorPalette(buildPalette(v))
    .withOverrides({ themeName: v.name })
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        TextTheme: {
          headingOne: { color: v.foreground, ...ThemeTextStyles.bold },
          headingTwo: { color: v.foreground, ...ThemeTextStyles.bold },
          headingThree: { color: v.foreground, ...ThemeTextStyles.bold },
          headingFour: { color: v.foreground, ...ThemeTextStyles.bold },
          normal: { ...ThemeTextStyles.regular, color: v.foreground, lineHeight: 30 },
          bold: { color: v.foreground, ...ThemeTextStyles.bold, lineHeight: 30 },
          label: { ...ThemeTextStyles.regular, color: v.foreground },
          labelTitle: { color: v.foreground, ...ThemeTextStyles.bold },
          labelSubtitle: { ...ThemeTextStyles.regular, color: v.foreground },
          labelText: { ...ThemeTextStyles.regular, color: v.foreground },
          caption: { ...ThemeTextStyles.regular, color: v.foreground },
          headerTitle: {
            color: theme.ColorPalette.brand.headerText,
            ...ThemeTextStyles.bold,
            fontSize: 18,
          },
          modalNormal: { ...ThemeTextStyles.regular, color: v.foreground },
          modalTitle: { ...ThemeTextStyles.regular, color: v.foreground, fontSize: 28 },
          modalHeadingOne: { ...ThemeTextStyles.regular, color: v.foreground, fontWeight: undefined },
          modalHeadingThree: { ...ThemeTextStyles.regular, color: v.foreground, fontWeight: undefined },
          popupModalText: { ...ThemeTextStyles.regular, color: v.foreground },
          settingsText: {
            ...theme.TextTheme.settingsText,
            ...ThemeTextStyles.regular,
            color: v.foreground,
          },
          inlineErrorText: {
            ...theme.TextTheme.inlineErrorText,
            ...ThemeTextStyles.regular,
            color: v.inlineErrorText,
          },
          inlineWarningText: {
            ...ThemeTextStyles.regular,
            color: theme.ColorPalette.notification.warnText,
          },
          title: {
            ...ThemeTextStyles.regular,
            color: theme.ColorPalette.notification.infoText,
          },
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        NavigationTheme: {
          dark: v.navigationDark,
          colors: {
            card: theme.ColorPalette.brand.primaryBackground,
            border: v.navigationBorder,
            primary: v.navigationPrimary,
            text: v.navigationText,
          },
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        LoadingTheme: {
          backgroundColor: theme.ColorPalette.brand.primary,
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        PINInputTheme: {
          cell: {
            backgroundColor: theme.ColorPalette.grayscale.white,
            borderColor: theme.ColorPalette.grayscale.lightGrey,
            borderWidth: undefined,
          },
          focussedCell: { borderColor: '#7090E4' },
          labelAndFieldContainer: {
            backgroundColor: theme.ColorPalette.grayscale.white,
            borderColor: theme.ColorPalette.grayscale.lightGrey,
            borderWidth: undefined,
          },
          cellText: { color: theme.ColorPalette.grayscale.darkGrey },
          icon: { color: theme.ColorPalette.grayscale.darkGrey },
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        OnboardingTheme: {
          bodyText: { color: v.onboardingBodyText },
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
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        Inputs: {
          textInput: {
            backgroundColor: theme.ColorPalette.grayscale.white,
            borderColor: theme.ColorPalette.grayscale.lightGrey,
            color: v.textOnWhite,
            borderWidth: 1,
            margin: 1,
          },
          inputSelected: {
            borderColor: '#7090E4',
            borderWidth: 2,
            margin: 0,
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
          singleSelectIcon: { color: v.textOnWhite },
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        Buttons: {
          critical: { backgroundColor: theme.ColorPalette.semantic.error },
          primaryText: {
            ...theme.TextTheme.normal,
            color: theme.ColorPalette.brand.text,
            ...ThemeTextStyles.bold,
            textAlign: 'center',
          },
          primaryTextDisabled: {
            ...theme.TextTheme.normal,
            color: theme.ColorPalette.brand.text,
            ...ThemeTextStyles.bold,
            textAlign: 'center',
          },
          secondary: v.secondaryButton,
          secondaryText: {
            color: v.secondaryButtonText,
            ...ThemeTextStyles.bold,
            textAlign: 'center',
          },
          secondaryTextDisabled: {
            color: theme.ColorPalette.brand.secondaryDisabled,
            ...ThemeTextStyles.bold,
            textAlign: 'center',
          },
          tertiary: {
            borderRadius: 4,
            borderWidth: 0,
            backgroundColor: v.tertiaryButtonBackground,
          },
          tertiaryDisabled: {
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.ColorPalette.brand.tertiaryDisabled,
          },
          tertiaryText: { color: v.textOnWhite, ...ThemeTextStyles.bold },
          tertiaryTextDisabled: {
            color: theme.ColorPalette.brand.secondaryDisabled,
            ...ThemeTextStyles.bold,
          },
          modalPrimaryText: { textAlign: 'center', color: v.textOnWhite },
          modalSecondary: { borderColor: theme.ColorPalette.brand.primary },
          modalSecondaryText: { textAlign: 'center' },
          modalCritical: { backgroundColor: theme.ColorPalette.semantic.error },
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
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        ListItems: {
          avatarCircle: { borderColor: theme.ColorPalette.grayscale.lightGrey },
          contactTitle: { color: theme.ColorPalette.grayscale.darkGrey },
          contactDate: { color: theme.ColorPalette.grayscale.darkGrey },
          contactIcon: { color: theme.ColorPalette.brand.secondaryBackground },
          credentialOfferTitle: { fontWeight: undefined },
          requestTemplateTitle: {
            color: theme.ColorPalette.grayscale.black,
            fontWeight: 'bold',
            fontSize: undefined,
          },
          requestTemplateDetails: {
            color: theme.ColorPalette.grayscale.black,
            fontSize: undefined,
          },
          requestTemplateDate: { fontSize: undefined },
          requestTemplateIcon: { fontSize: undefined },
          requestTemplateZkpLabel: { fontSize: undefined },
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        TabTheme: {
          tabBarStyle: {
            justifyContent: 'space-around',
            backgroundColor: v.tabBarBackground,
            shadowColor: theme.ColorPalette.grayscale.black,
          },
          focusTabIconStyle: { backgroundColor: theme.ColorPalette.brand.primary },
          focusTabActiveTintColor: { backgroundColor: theme.ColorPalette.brand.secondary },
          tabBarTextStyle: { ...theme.TabTheme.tabBarTextStyle, color: v.foreground },
          tabBarButtonIconStyle: { color: v.tabBarIcon },
          tabBarSecondaryBackgroundColor: v.tabBarBackground,
          tabBarActiveTintColor: theme.ColorPalette.brand.primary,
          tabBarInactiveTintColor: v.foreground,
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        SettingsTheme: {
          groupHeader: {
            ...theme.TextTheme.normal,
            ...theme.SettingsTheme.groupHeader,
            color: theme.ColorPalette.grayscale.darkGrey,
          },
          iconColor: v.foregroundSubtle,
          text: { ...theme.TextTheme.caption, color: v.foregroundSubtle },
          groupBackground: theme.ColorPalette.brand.secondaryBackground,
        },
      })
    )
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        ChatTheme: {
          timeStyleLeft: { color: v.foreground },
          timeStyleRight: { color: v.foreground },
          leftText: { color: v.foreground },
          leftTextHighlighted: {
            color: v.foreground,
            fontSize: theme.TextTheme.normal.fontSize,
            fontWeight: 'bold',
            fontFamily: undefined,
          },
          rightText: { color: v.foreground, fontSize: theme.TextTheme.normal.fontSize },
          rightTextHighlighted: {
            color: v.foreground,
            fontSize: theme.TextTheme.normal.fontSize,
            fontWeight: 'bold',
            fontFamily: undefined,
          },
          inputToolbar: { ...theme.ChatTheme.inputToolbar },
          inputText: { color: theme.Inputs.textInput.color },
          optionsText: v.foreground,
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
    .withOverrides(
      (theme): DeepPartial<ITheme> => ({
        HomeTheme: {
          noNewUpdatesText: {
            ...theme.TextTheme.normal,
            color: theme.ColorPalette.notification.infoText,
          },
          link: { ...theme.TextTheme.normal, color: theme.ColorPalette.brand.link },
        },
      })
    )
    .withOverrides({
      Assets: {
        svg: {
          logo: v.logo,
        },
      },
    })
    .build()
}
