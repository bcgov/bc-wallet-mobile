import { ColorPallet, IColorPallet, IInputs, INotificationColors, ITabTheme, ITextTheme, ITheme } from '@bifold/core'
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

export const BCSCColorPallet: IColorPallet = {
  ...BCWalletTheme.ColorPallet,
  notification: BCSCNotificationColors,
  brand: {
    ...BCWalletTheme.ColorPallet.brand,
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
}

export const BCSCTextTheme: ITextTheme = {
  ...BCWalletTheme.TextTheme,
  headingOne: {
    ...BCWalletTheme.TextTheme.headingOne,
    color: BCSCColorPallet.grayscale.white,
  },
  headingTwo: {
    ...BCWalletTheme.TextTheme.headingTwo,
    color: BCSCColorPallet.grayscale.white,
  },
  headingThree: {
    ...BCWalletTheme.TextTheme.headingThree,
    color: BCSCColorPallet.grayscale.white,
  },
  headingFour: {
    ...BCWalletTheme.TextTheme.headingFour,
    color: BCSCColorPallet.grayscale.white,
  },
  normal: {
    ...BCWalletTheme.TextTheme.normal,
    color: BCSCColorPallet.grayscale.white,
  },
  bold: {
    ...BCWalletTheme.TextTheme.bold,
    color: BCSCColorPallet.grayscale.white,
  },
  label: {
    ...BCWalletTheme.TextTheme.label,
    color: BCSCColorPallet.grayscale.white,
  },
  labelTitle: {
    ...BCWalletTheme.TextTheme.labelTitle,
    color: BCSCColorPallet.grayscale.white,
  },
  labelSubtitle: {
    ...BCWalletTheme.TextTheme.labelSubtitle,
    color: BCSCColorPallet.grayscale.white,
  },
  labelText: {
    ...BCWalletTheme.TextTheme.labelText,
    color: BCSCColorPallet.grayscale.white,
  },
  caption: {
    ...BCWalletTheme.TextTheme.caption,
    color: BCSCColorPallet.grayscale.white,
  },
  title: {
    ...BCWalletTheme.TextTheme.title,
    color: BCSCColorPallet.notification.infoText,
  },
  headerTitle: {
    ...BCWalletTheme.TextTheme.headerTitle,
    color: BCSCColorPallet.brand.headerText,
  },
  modalNormal: {
    ...BCWalletTheme.TextTheme.modalNormal,
    color: BCSCColorPallet.grayscale.white,
  },
  modalTitle: {
    ...BCWalletTheme.TextTheme.modalTitle,
    color: BCSCColorPallet.grayscale.white,
  },
  modalHeadingOne: {
    ...BCWalletTheme.TextTheme.modalHeadingOne,
    color: BCSCColorPallet.grayscale.white,
  },
  modalHeadingThree: {
    ...BCWalletTheme.TextTheme.modalHeadingThree,
    color: BCSCColorPallet.grayscale.white,
  },
  popupModalText: {
    ...BCWalletTheme.TextTheme.popupModalText,
    color: BCSCColorPallet.grayscale.white,
  },
  settingsText: {
    ...BCWalletTheme.TextTheme.settingsText,
    color: BCSCColorPallet.grayscale.white,
  },
  inlineErrorText: {
    ...BCWalletTheme.TextTheme.inlineErrorText,
    color: BCSCColorPallet.notification.errorText,
  },
  inlineWarningText: {
    ...BCWalletTheme.TextTheme.inlineWarningText,
    color: BCSCColorPallet.notification.warnText,
  },
}

export const BCSCNavigationTheme = {
  dark: true,
  colors: {
    primary: BCSCColorPallet.brand.primaryBackground,
    background: BCSCColorPallet.brand.primaryBackground,
    card: BCSCColorPallet.brand.primaryBackground,
    text: BCSCColorPallet.brand.text,
    border: BCSCColorPallet.grayscale.white,
    notification: BCSCColorPallet.grayscale.white,
  },
}

export const BCSCOnboardingTheme = {
  container: {
    backgroundColor: BCSCColorPallet.brand.primaryBackground,
  },
  carouselContainer: {
    backgroundColor: BCSCColorPallet.brand.primaryBackground,
  },
  pagerDot: {
    borderColor: BCSCColorPallet.brand.primary,
  },
  pagerDotActive: {
    color: BCSCColorPallet.brand.primary,
  },
  pagerDotInactive: {
    color: BCSCColorPallet.brand.secondary,
  },
  pagerNavigationButton: {
    color: BCSCColorPallet.brand.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTintColor: BCSCColorPallet.grayscale.white,
  headerText: {
    ...BCSCTextTheme.headingTwo,
    color: BCSCColorPallet.notification.infoText,
  },
  bodyText: {
    ...BCSCTextTheme.normal,
    color: BCSCColorPallet.notification.infoText,
  },
  imageDisplayOptions: {
    fill: BCSCColorPallet.notification.infoText,
  },
}

export const BCSCDialogTheme = {
  modalView: {
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  titleText: {
    color: BCSCColorPallet.grayscale.white,
  },
  description: {
    color: BCSCColorPallet.grayscale.white,
  },
  closeButtonIcon: {
    color: BCSCColorPallet.grayscale.white,
  },
  carouselButtonText: {
    color: BCSCColorPallet.grayscale.white,
  },
}

export const BCSCLoadingTheme = {
  backgroundColor: BCSCColorPallet.brand.primary,
}

export const BCSCPINInputTheme = {
  ...PINInputTheme,
  cell: {
    backgroundColor: BCSCColorPallet.grayscale.white,
    borderColor: BCSCColorPallet.grayscale.lightGrey,
  },
  focussedCell: {
    borderColor: '#3399FF',
  },
  cellText: {
    color: BCSCColorPallet.grayscale.darkGrey,
  },
  icon: {
    color: BCSCColorPallet.grayscale.darkGrey,
  },
  labelAndFieldContainer: {
    ...PINInputTheme.labelAndFieldContainer,
    backgroundColor: BCSCColorPallet.grayscale.white,
    borderColor: BCSCColorPallet.grayscale.white,
  },
}

export const BCSCInputs: IInputs = StyleSheet.create({
  ...Inputs,
  label: {
    ...BCSCTextTheme.label,
  },
  textInput: {
    ...Inputs.textInput,
    backgroundColor: BCSCColorPallet.grayscale.white,
    color: BCSCColorPallet.brand.text,
    borderColor: BCSCColorPallet.grayscale.lightGrey,
  },
  inputSelected: {
    borderColor: ColorPallet.grayscale.lightGrey,
  },
  singleSelect: {
    ...Inputs.singleSelect,
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  singleSelectText: {
    ...BCSCTextTheme.normal,
  },
  singleSelectIcon: {
    color: BCSCColorPallet.brand.text,
  },
  checkBoxColor: {
    color: BCSCColorPallet.brand.primary,
  },
  checkBoxText: {
    ...BCSCTextTheme.normal,
  },
})

export const BCSCButtons = StyleSheet.create({
  ...Buttons,
  critical: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#D8292F',
  },
  primary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPallet.brand.primary,
  },
  primaryDisabled: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPallet.brand.primaryDisabled,
  },
  primaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPallet.brand.text,
    textAlign: 'center',
  },
  primaryTextDisabled: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPallet.brand.text,
    textAlign: 'center',
  },
  secondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPallet.brand.primary,
  },
  secondaryDisabled: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPallet.brand.secondaryDisabled,
  },
  secondaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPallet.brand.primary,
    textAlign: 'center',
  },
  secondaryTextDisabled: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPallet.brand.secondaryDisabled,
    textAlign: 'center',
  },
  modalCritical: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#D8292F',
  },
  modalPrimary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: BCSCColorPallet.brand.primary,
  },
  modalPrimaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BCSCColorPallet.brand.text,
  },
  modalSecondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: BCSCColorPallet.brand.primary,
  },
  modalSecondaryText: {
    ...BCSCTextTheme.normal,
    fontWeight: 'bold',
    color: BCSCColorPallet.brand.primary,
    textAlign: 'center',
  },
})

export const BCSCListItems = StyleSheet.create({
  ...ListItems,
  credentialBackground: {
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  credentialTitle: {
    ...BCSCTextTheme.headingFour,
  },
  credentialDetails: {
    ...BCSCTextTheme.caption,
  },
  credentialOfferBackground: {
    backgroundColor: BCSCColorPallet.brand.modalPrimaryBackground,
  },
  credentialOfferTitle: {
    ...BCSCTextTheme.modalHeadingThree,
  },
  credentialOfferDetails: {
    ...BCSCTextTheme.normal,
  },
  revoked: {
    backgroundColor: BCSCColorPallet.notification.error,
    borderColor: BCSCColorPallet.notification.errorBorder,
  },
  contactBackground: {
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  credentialIconColor: {
    color: BCSCColorPallet.notification.infoText,
  },
  contactTitle: {
    fontFamily: BCSCTextTheme.title.fontFamily,
    color: BCSCColorPallet.grayscale.darkGrey,
  },
  contactDate: {
    fontFamily: BCSCTextTheme.normal.fontFamily,
    color: BCSCColorPallet.grayscale.darkGrey,
    marginTop: 10,
  },
  contactIconBackground: {
    backgroundColor: BCSCColorPallet.brand.primary,
  },
  contactIcon: {
    color: BCSCColorPallet.brand.text,
  },
  recordAttributeLabel: {
    ...BCSCTextTheme.bold,
  },
  recordContainer: {
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  recordBorder: {
    borderBottomColor: BCSCColorPallet.brand.primaryBackground,
  },
  recordLink: {
    color: BCSCColorPallet.brand.link,
  },
  recordAttributeText: {
    ...BCSCTextTheme.normal,
  },
  proofIcon: {
    ...BCSCTextTheme.headingOne,
  },
  proofError: {
    color: BCSCColorPallet.semantic.error,
  },
  proofListItem: {
    paddingHorizontal: 25,
    paddingTop: 16,
    backgroundColor: BCSCColorPallet.brand.primaryBackground,
    borderTopColor: BCSCColorPallet.brand.secondaryBackground,
    borderBottomColor: BCSCColorPallet.brand.secondaryBackground,
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  avatarText: {
    ...BCSCTextTheme.headingTwo,
    fontWeight: 'normal',
  },
  avatarCircle: {
    borderRadius: BCSCTextTheme.headingTwo.fontSize,
    borderColor: BCSCColorPallet.grayscale.lightGrey,
    width: BCSCTextTheme.headingTwo.fontSize * 2,
    height: BCSCTextTheme.headingTwo.fontSize * 2,
  },
  emptyList: {
    ...BCSCTextTheme.normal,
  },
  requestTemplateBackground: {
    backgroundColor: BCSCColorPallet.grayscale.white,
  },
  requestTemplateIconColor: {
    color: BCSCColorPallet.notification.infoText,
  },
  requestTemplateTitle: {
    color: BCSCColorPallet.grayscale.black,
    fontWeight: 'bold',
  },
  requestTemplateDetails: {
    color: BCSCColorPallet.grayscale.black,
    fontWeight: 'normal',
  },
  requestTemplateZkpLabel: {
    color: BCSCColorPallet.grayscale.mediumGrey,
  },
  requestTemplateIcon: {
    color: BCSCColorPallet.grayscale.black,
  },
  requestTemplateDate: {
    color: BCSCColorPallet.grayscale.mediumGrey,
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
    shadowColor: BCSCColorPallet.grayscale.black,
    shadowOpacity: 0.1,
    borderTopWidth: 0,
    paddingBottom: 0,
  },
  tabBarActiveTintColor: BCSCColorPallet.brand.primary,
  tabBarInactiveTintColor: BCSCColorPallet.grayscale.white,
  tabBarTextStyle: {
    ...BCSCTextTheme.label,
    ...TabTheme.tabBarTextStyle,
    color: BCSCColorPallet.grayscale.white,
  },
  tabBarButtonIconStyle: {
    color: BCSCColorPallet.brand.primaryBackground,
  },
  focusTabIconStyle: {
    height: 60,
    width: 60,
    backgroundColor: BCSCColorPallet.brand.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTabActiveTintColor: {
    backgroundColor: BCSCColorPallet.brand.secondary,
  },
  tabBarSecondaryBackgroundColor: '#252423',
}

export const BCSCHomeTheme = StyleSheet.create({
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
    color: BCSCColorPallet.notification.infoText,
  },
  link: {
    ...BCSCTextTheme.normal,
    color: BCSCColorPallet.brand.link,
  },
})

export const BCSCSettingsTheme = {
  ...SettingsTheme,
  groupHeader: {
    ...BCSCTextTheme.normal,
    ...SettingsTheme.groupHeader,
  },
  groupBackground: BCSCColorPallet.brand.secondaryBackground,
  iconColor: BCSCColorPallet.grayscale.veryLightGrey,
  text: {
    ...BCSCTextTheme.caption,
    color: BCSCColorPallet.grayscale.veryLightGrey,
  },
}

export const BCSCChatTheme = {
  ...ChatTheme,
  leftBubble: {
    ...ChatTheme.leftBubble,
    backgroundColor: BCSCColorPallet.brand.secondaryBackground,
  },
  rightBubble: {
    ...ChatTheme.rightBubble,
    backgroundColor: BCSCColorPallet.brand.primaryLight,
  },
  timeStyleLeft: {
    ...ChatTheme.timeStyleLeft,
    color: BCSCColorPallet.grayscale.white,
  },
  timeStyleRight: {
    ...ChatTheme.timeStyleRight,
    color: BCSCColorPallet.grayscale.white,
  },
  leftText: {
    ...ChatTheme.leftText,
    color: BCSCColorPallet.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
  },
  leftTextHighlighted: {
    color: BCSCColorPallet.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  rightText: {
    color: BCSCColorPallet.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
  },
  rightTextHighlighted: {
    color: BCSCColorPallet.grayscale.white,
    fontSize: BCSCTextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  inputToolbar: {
    ...ChatTheme.inputToolbar,
    backgroundColor: BCSCColorPallet.brand.secondary,
    shadowColor: BCSCColorPallet.brand.primaryDisabled,
  },
  inputText: {
    lineHeight: undefined,
    fontWeight: '500',
    fontSize: BCSCTextTheme.normal.fontSize,
    color: BCSCInputs.textInput.color,
  },
  placeholderText: BCSCColorPallet.grayscale.lightGrey,
  sendEnabled: BCSCColorPallet.brand.primary,
  sendDisabled: BCSCColorPallet.brand.primaryDisabled,
  options: BCSCColorPallet.brand.primary,
  optionsText: BCSCColorPallet.grayscale.white,
  openButtonStyle: {
    borderRadius: 32,
    backgroundColor: BCSCColorPallet.brand.primary,
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
    color: BCSCColorPallet.grayscale.white,
  },
}

export const BCSCAssets = {
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
  ColorPallet: BCSCColorPallet,
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
