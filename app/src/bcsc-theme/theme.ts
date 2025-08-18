import {
  ColorPalette,
  IAssets,
  IColorPalette,
  IInputs,
  INotificationColors,
  ITabTheme,
  ITextTheme,
  ITheme,
} from '@bifold/core'
import { StyleSheet } from 'react-native'

import Logo from '@assets/img/logo-with-text-dark.svg'
import { BCThemeNames } from '@/constants'
import {
  Assets,
  BCWalletTheme,
  Buttons,
  ChatTheme,
  GrayscaleColors,
  HomeTheme,
  Inputs,
  ListItems,
  NotificationColors,
  PINInputTheme,
  SettingsTheme,
  TabTheme,
} from '@bcwallet-theme/theme'

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

<<<<<<< HEAD
export const BCSCTextTheme: ITextTheme = {
  ...BCWalletTheme.TextTheme,
  headingOne: {
    ...BCWalletTheme.TextTheme.headingOne,
    color: BCSCColorPalette.grayscale.white,
  },
  headingTwo: {
    ...BCWalletTheme.TextTheme.headingTwo,
    color: BCSCColorPalette.grayscale.white,
  },
  headingThree: {
    ...BCWalletTheme.TextTheme.headingThree,
    color: BCSCColorPalette.grayscale.white,
  },
  headingFour: {
    ...BCWalletTheme.TextTheme.headingFour,
    color: BCSCColorPalette.grayscale.white,
  },
  normal: {
    ...BCWalletTheme.TextTheme.normal,
    color: BCSCColorPalette.grayscale.white,
  },
  bold: {
    ...BCWalletTheme.TextTheme.bold,
    color: BCSCColorPalette.grayscale.white,
  },
  label: {
    ...BCWalletTheme.TextTheme.label,
    color: BCSCColorPalette.grayscale.white,
  },
  labelTitle: {
    ...BCWalletTheme.TextTheme.labelTitle,
    color: BCSCColorPalette.grayscale.white,
  },
  labelSubtitle: {
    ...BCWalletTheme.TextTheme.labelSubtitle,
    color: BCSCColorPalette.grayscale.white,
  },
  labelText: {
    ...BCWalletTheme.TextTheme.labelText,
    color: BCSCColorPalette.grayscale.white,
  },
  caption: {
    ...BCWalletTheme.TextTheme.caption,
    color: BCSCColorPalette.grayscale.white,
  },
  title: {
    ...BCWalletTheme.TextTheme.title,
    color: BCSCColorPalette.notification.infoText,
  },
  headerTitle: {
    ...BCWalletTheme.TextTheme.headerTitle,
    color: BCSCColorPalette.brand.headerText,
  },
  modalNormal: {
    ...BCWalletTheme.TextTheme.modalNormal,
    color: BCSCColorPalette.grayscale.white,
  },
  modalTitle: {
    ...BCWalletTheme.TextTheme.modalTitle,
    color: BCSCColorPalette.grayscale.white,
  },
  modalHeadingOne: {
    ...BCWalletTheme.TextTheme.modalHeadingOne,
    color: BCSCColorPalette.grayscale.white,
  },
  modalHeadingThree: {
    ...BCWalletTheme.TextTheme.modalHeadingThree,
    color: BCSCColorPalette.grayscale.white,
  },
  popupModalText: {
    ...BCWalletTheme.TextTheme.popupModalText,
    color: BCSCColorPalette.grayscale.white,
  },
  settingsText: {
    ...BCWalletTheme.TextTheme.settingsText,
    color: BCSCColorPalette.grayscale.white,
  },
  inlineErrorText: {
    ...BCWalletTheme.TextTheme.inlineErrorText,
    color: BCSCColorPalette.notification.errorText,
  },
  inlineWarningText: {
    ...BCWalletTheme.TextTheme.inlineWarningText,
    color: BCSCColorPalette.notification.warnText,
  },
}

export const BCSCNavigationTheme: ITheme['NavigationTheme'] = {
  dark: true,
  colors: {
    primary: BCSCColorPalette.brand.primaryBackground,
    background: BCSCColorPalette.brand.primaryBackground,
    card: BCSCColorPalette.brand.primaryBackground,
    text: BCSCColorPalette.brand.text,
    border: BCSCColorPalette.grayscale.darkGrey,
    notification: BCSCColorPalette.grayscale.white,
  },
}

export const BCSCOnboardingTheme: ITheme['OnboardingTheme'] = {
  container: {
    backgroundColor: BCSCColorPalette.brand.primaryBackground,
  },
  carouselContainer: {
    backgroundColor: BCSCColorPalette.brand.primaryBackground,
  },
  pagerDot: {
    borderColor: BCSCColorPalette.brand.primary,
  },
  pagerDotActive: {
    color: BCSCColorPalette.brand.primary,
  },
  pagerDotInactive: {
    color: BCSCColorPalette.brand.secondary,
  },
  pagerNavigationButton: {
    color: BCSCColorPalette.brand.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTintColor: BCSCColorPalette.grayscale.white,
  headerText: {
    ...BCSCTextTheme.headingTwo,
    color: BCSCColorPalette.notification.infoText,
  },
  bodyText: {
    ...BCSCTextTheme.normal,
    color: BCSCColorPalette.notification.infoText,
  },
  imageDisplayOptions: {
    fill: BCSCColorPalette.notification.infoText,
  },
}

export const BCSCDialogTheme: ITheme['DialogTheme'] = {
  modalView: {
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  titleText: {
    color: BCSCColorPalette.grayscale.white,
  },
  description: {
    color: BCSCColorPalette.grayscale.white,
  },
  closeButtonIcon: {
    color: BCSCColorPalette.grayscale.white,
  },
  carouselButtonText: {
    color: BCSCColorPalette.grayscale.white,
  },
}

export const BCSCLoadingTheme: ITheme['LoadingTheme'] = {
  backgroundColor: BCSCColorPalette.brand.primary,
}

export const BCSCPINInputTheme: ITheme['PINInputTheme'] = {
  ...PINInputTheme,
  cell: {
    backgroundColor: BCSCColorPalette.grayscale.white,
    borderColor: BCSCColorPalette.grayscale.lightGrey,
  },
  focussedCell: {
    borderColor: '#3399FF',
  },
  cellText: {
    color: BCSCColorPalette.grayscale.darkGrey,
  },
  icon: {
    color: BCSCColorPalette.grayscale.darkGrey,
  },
  labelAndFieldContainer: {
    ...PINInputTheme.labelAndFieldContainer,
    backgroundColor: BCSCColorPalette.grayscale.white,
    borderColor: BCSCColorPalette.grayscale.white,
  },
}

export const BCSCInputs: IInputs = StyleSheet.create({
  ...Inputs,
  label: {
    ...BCSCTextTheme.label,
  },
  textInput: {
    ...Inputs.textInput,
    backgroundColor: BCSCColorPalette.grayscale.white,
    color: BCSCColorPalette.brand.text,
    borderColor: BCSCColorPalette.grayscale.lightGrey,
  },
  inputSelected: {
    borderColor: ColorPalette.grayscale.lightGrey,
  },
  singleSelect: {
    ...Inputs.singleSelect,
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  singleSelectText: {
    ...BCSCTextTheme.normal,
  },
  singleSelectIcon: {
    color: BCSCColorPalette.brand.text,
  },
  checkBoxColor: {
    color: BCSCColorPalette.brand.primary,
  },
  checkBoxText: {
    ...BCSCTextTheme.normal,
  },
})

export const BCSCButtons: ITheme['Buttons'] = StyleSheet.create({
  ...Buttons,
  primary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPalette.brand.primary,
  },
  primaryDisabled: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPalette.brand.primaryDisabled,
  },
  primaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.text,
    textAlign: 'center',
  },
  primaryTextDisabled: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.text,
    textAlign: 'center',
  },
  secondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPalette.brand.primary,
  },
  secondaryDisabled: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPalette.brand.secondaryDisabled,
  },
  secondaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.primary,
    textAlign: 'center',
  },
  secondaryTextDisabled: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.secondaryDisabled,
    textAlign: 'center',
  },
  tertiary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 0,
    backgroundColor: BCSCColorPalette.grayscale.white,
  },
  tertiaryDisabled: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPalette.brand.tertiaryDisabled,
  },
  tertiaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.text,
    textAlign: 'center',
  },
  tertiaryTextDisabled: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.secondaryDisabled,
    textAlign: 'center',
  },
  modalPrimary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPalette.brand.primary,
  },
  modalPrimaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BCSCColorPalette.brand.text,
  },
  modalSecondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPalette.brand.primary,
  },
  modalSecondaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPalette.brand.primary,
    textAlign: 'center',
  },
})

export const BCSCListItems: ITheme['ListItems'] = StyleSheet.create({
  ...ListItems,
  credentialBackground: {
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  credentialTitle: {
    ...BCSCTextTheme.headingFour,
  },
  credentialDetails: {
    ...BCSCTextTheme.caption,
  },
  credentialOfferBackground: {
    backgroundColor: BCSCColorPalette.brand.modalPrimaryBackground,
  },
  credentialOfferTitle: {
    ...BCSCTextTheme.modalHeadingThree,
  },
  credentialOfferDetails: {
    ...BCSCTextTheme.normal,
  },
  revoked: {
    backgroundColor: BCSCColorPalette.notification.error,
    borderColor: BCSCColorPalette.notification.errorBorder,
  },
  contactBackground: {
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  credentialIconColor: {
    color: BCSCColorPalette.notification.infoText,
  },
  contactTitle: {
    fontFamily: BCSCTextTheme.title.fontFamily,
    color: BCSCColorPalette.grayscale.darkGrey,
  },
  contactDate: {
    fontFamily: BCSCTextTheme.normal.fontFamily,
    color: BCSCColorPalette.grayscale.darkGrey,
    marginTop: 10,
  },
  contactIconBackground: {
    backgroundColor: BCSCColorPalette.brand.primary,
  },
  contactIcon: {
    color: BCSCColorPalette.brand.text,
  },
  recordAttributeLabel: {
    ...BCSCTextTheme.bold,
  },
  recordContainer: {
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  recordBorder: {
    borderBottomColor: BCSCColorPalette.brand.primaryBackground,
  },
  recordLink: {
    color: BCSCColorPalette.brand.link,
  },
  recordAttributeText: {
    ...BCSCTextTheme.normal,
  },
  proofIcon: {
    ...BCSCTextTheme.headingOne,
  },
  proofError: {
    color: BCSCColorPalette.semantic.error,
  },
  proofListItem: {
    paddingHorizontal: 25,
    paddingTop: 16,
    backgroundColor: BCSCColorPalette.brand.primaryBackground,
    borderTopColor: BCSCColorPalette.brand.secondaryBackground,
    borderBottomColor: BCSCColorPalette.brand.secondaryBackground,
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  avatarText: {
    ...BCSCTextTheme.headingTwo,
    fontWeight: 'normal',
  },
  avatarCircle: {
    borderRadius: BCSCTextTheme.headingTwo.fontSize,
    borderColor: BCSCColorPalette.grayscale.lightGrey,
    width: BCSCTextTheme.headingTwo.fontSize * 2,
    height: BCSCTextTheme.headingTwo.fontSize * 2,
  },
  emptyList: {
    ...BCSCTextTheme.normal,
  },
  requestTemplateBackground: {
    backgroundColor: BCSCColorPalette.grayscale.white,
  },
  requestTemplateIconColor: {
    color: BCSCColorPalette.notification.infoText,
  },
  requestTemplateTitle: {
    color: BCSCColorPalette.grayscale.black,
    fontWeight: 'bold',
  },
  requestTemplateDetails: {
    color: BCSCColorPalette.grayscale.black,
    fontWeight: 'normal',
  },
  requestTemplateZkpLabel: {
    color: BCSCColorPalette.grayscale.mediumGrey,
  },
  requestTemplateIcon: {
    color: BCSCColorPalette.grayscale.black,
  },
  requestTemplateDate: {
    color: BCSCColorPalette.grayscale.mediumGrey,
  },
})

export const BCSCTabTheme: ITabTheme = {
  ...TabTheme,
  tabBarStyle: {
    justifyContent: 'space-around',
    height: 60,
    backgroundColor: '#252423',
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
    shadowColor: BCSCColorPalette.grayscale.black,
    shadowOpacity: 0.1,
    borderTopWidth: 0,
    paddingBottom: 0,
  },
  tabBarActiveTintColor: BCSCColorPalette.brand.primary,
  tabBarInactiveTintColor: BCSCColorPalette.grayscale.white,
  tabBarTextStyle: {
    ...BCSCTextTheme.label,
    ...TabTheme.tabBarTextStyle,
    color: BCSCColorPalette.grayscale.white,
  },
  tabBarButtonIconStyle: {
    color: BCSCColorPalette.brand.primaryBackground,
  },
  focusTabIconStyle: {
    height: 60,
    width: 60,
    backgroundColor: BCSCColorPalette.brand.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTabActiveTintColor: {
    backgroundColor: BCSCColorPalette.brand.secondary,
  },
  tabBarSecondaryBackgroundColor: '#252423',
}

export const BCSCHomeTheme: ITheme['HomeTheme'] = StyleSheet.create({
  ...HomeTheme,
  welcomeHeader: {
    ...BCSCTextTheme.headingOne,
  },
  credentialMsg: {
    ...BCSCTextTheme.normal,
  },
  notificationsHeader: {
    ...BCSCTextTheme.headingThree,
  },
  noNewUpdatesText: {
    ...BCSCTextTheme.normal,
    color: BCSCColorPalette.notification.infoText,
  },
  link: {
    ...BCSCTextTheme.normal,
    color: BCSCColorPalette.brand.link,
  },
})

export const BCSCSettingsTheme: ITheme['SettingsTheme'] = {
  ...SettingsTheme,
  groupHeader: {
    ...BCSCTextTheme.normal,
    ...SettingsTheme.groupHeader,
  },
  groupBackground: BCSCColorPalette.brand.secondaryBackground,
  iconColor: BCSCColorPalette.grayscale.veryLightGrey,
  text: {
    ...BCSCTextTheme.caption,
    color: BCSCColorPalette.grayscale.veryLightGrey,
  },
}

export const BCSCChatTheme: ITheme['ChatTheme'] = {
  ...ChatTheme,
  leftBubble: {
    ...ChatTheme.leftBubble,
    backgroundColor: BCSCColorPalette.brand.secondaryBackground,
  },
  rightBubble: {
    ...ChatTheme.rightBubble,
    backgroundColor: BCSCColorPalette.brand.primaryLight,
  },
  timeStyleLeft: {
    ...ChatTheme.timeStyleLeft,
    color: BCSCColorPalette.grayscale.white,
  },
  timeStyleRight: {
    ...ChatTheme.timeStyleRight,
    color: BCSCColorPalette.grayscale.white,
  },
  leftText: {
    ...ChatTheme.leftText,
    color: BCSCColorPalette.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
  },
  leftTextHighlighted: {
    color: BCSCColorPalette.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  rightText: {
    color: BCSCColorPalette.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
  },
  rightTextHighlighted: {
    color: BCSCColorPalette.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  inputToolbar: {
    ...ChatTheme.inputToolbar,
    backgroundColor: BCSCColorPalette.brand.secondary,
    shadowColor: BCSCColorPalette.brand.primaryDisabled,
  },
  inputText: {
    lineHeight: undefined,
    fontWeight: '500',
    fontSize: BCSCTextTheme.normal.fontSize,
    color: BCSCInputs.textInput.color,
  },
  placeholderText: BCSCColorPalette.grayscale.lightGrey,
  sendEnabled: BCSCColorPalette.brand.primary,
  sendDisabled: BCSCColorPalette.brand.primaryDisabled,
  options: BCSCColorPalette.brand.primary,
  optionsText: BCSCColorPalette.grayscale.white,
  openButtonStyle: {
    borderRadius: 32,
    backgroundColor: BCSCColorPalette.brand.primary,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    marginTop: 16,
  },
  openButtonTextStyle: {
    color: BCSCButtons.primaryText.color,
    fontSize: BCSCTextTheme.normal.fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  documentIconContainer: {
    backgroundColor: '#1c70bf',
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentIcon: {
    color: BCSCColorPalette.grayscale.white,
  },
}

export const BCSCAssets: IAssets = {
  ...Assets,
  svg: {
    ...Assets.svg,
    logo: Logo as React.FC,
  },
}

export const BCSCTheme: ITheme = {
  ...BCWalletTheme,
  Assets: BCSCAssets,
  themeName: BCThemeNames.BCSC,
  ColorPalette: BCSCColorPalette,
  TextTheme: BCSCTextTheme,
  Buttons: BCSCButtons,
  Inputs: BCSCInputs,
  ListItems: BCSCListItems,
  TabTheme: BCSCTabTheme,
  NavigationTheme: BCSCNavigationTheme,
  HomeTheme: BCSCHomeTheme,
  SettingsTheme: BCSCSettingsTheme,
  ChatTheme: BCSCChatTheme,
  OnboardingTheme: BCSCOnboardingTheme,
  DialogTheme: BCSCDialogTheme,
  LoadingTheme: BCSCLoadingTheme,
  PINInputTheme: BCSCPINInputTheme,
}
=======
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
          fontSize: 20,
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
          color: theme.ColorPalette.notification.errorText,
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
        },
        inputSelected: {
          borderColor: theme.ColorPalette.brand.highlight,
          borderWidth: 1,
          backgroundColor: theme.ColorPalette.grayscale.white,
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
          fontWeight: 'bold',
          textAlign: 'center',
        },
        primaryTextDisabled: {
          ...theme.TextTheme.normal,
          color: theme.ColorPalette.brand.text,
          fontWeight: 'bold',
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
>>>>>>> 9e98d8f (fix: issue with theme when focusing input (#2615))
