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
