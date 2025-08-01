import {
  ImageAssets as BifoldImageAssets,
  ISpacing,
  IInputs,
  IInlineInputMessage,
  ITextTheme,
  IBrandColors,
  ISemanticColors,
  INotificationColors,
  IGrayscaleColors,
  IColorPalette,
  ITabTheme,
  ITheme,
  IAssets,
} from '@bifold/core'
import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'

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

export const TextTheme: ITextTheme = {
  headingOne: {
    fontFamily: 'BCSans-Regular',
    fontSize: 38,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  headingTwo: {
    fontFamily: 'BCSans-Regular',
    fontSize: 32,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  headingThree: {
    fontFamily: 'BCSans-Regular',
    fontSize: 26,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  headingFour: {
    fontFamily: 'BCSans-Regular',
    fontSize: 21,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  normal: {
    fontFamily: 'BCSans-Regular',
    fontSize: 18,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  bold: {
    fontFamily: 'BCSans-Regular',
    fontSize: 18,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  label: {
    fontFamily: 'BCSans-Regular',
    fontSize: 14,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  labelTitle: {
    fontFamily: 'BCSans-Regular',
    fontSize: 16,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  labelSubtitle: {
    fontFamily: 'BCSans-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  labelText: {
    fontFamily: 'BCSans-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: ColorPalette.grayscale.darkGrey,
  },
  caption: {
    fontFamily: 'BCSans-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  title: {
    fontFamily: 'BCSans-Regular',
    fontSize: 20,
    fontWeight: 'bold',
    color: ColorPalette.notification.infoText,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ColorPalette.brand.headerText,
  },
  modalNormal: {
    fontSize: 18,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ColorPalette.grayscale.darkGrey,
  },
  modalHeadingOne: {
    fontSize: 38,
    color: ColorPalette.grayscale.darkGrey,
  },
  modalHeadingThree: {
    fontSize: 26,
    color: ColorPalette.grayscale.darkGrey,
  },
  popupModalText: {
    fontSize: 18,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  settingsText: {
    fontFamily: 'BCSans-Regular',
    fontSize: 21,
    fontWeight: 'normal',
    color: ColorPalette.grayscale.darkGrey,
  },
  inlineErrorText: {
    fontFamily: 'BCSans-Regular',
    fontSize: 16,
    fontWeight: 'normal',
    color: ColorPalette.notification.errorText,
  },
  inlineWarningText: {
    fontFamily: 'BCSans-Regular',
    fontSize: 16,
    fontWeight: 'normal',
    color: ColorPalette.notification.warnText,
  },
}

export const Inputs: IInputs = StyleSheet.create({
  label: {
    ...TextTheme.label,
  },
  textInput: {
    padding: 10,
    borderRadius,
    fontFamily: TextTheme.normal.fontFamily,
    fontSize: 16,
    backgroundColor: ColorPalette.grayscale.lightGrey,
    color: TextTheme.normal.color,
    borderWidth: 1,
    borderColor: ColorPalette.grayscale.lightGrey,
  },
  inputSelected: {
    borderColor: TextTheme.normal.color,
  },
  singleSelect: {
    padding: 12,
    borderRadius: borderRadius * 2,
    backgroundColor: ColorPalette.brand.secondaryBackground,
  },
  singleSelectText: {
    ...TextTheme.normal,
  },
  singleSelectIcon: {
    color: ColorPalette.brand.text,
  },
  checkBoxColor: {
    color: ColorPalette.brand.primary,
  },
  checkBoxText: {
    ...TextTheme.normal,
  },
})

export const Buttons: ITheme['Buttons'] = StyleSheet.create({
  critical: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#D8292F',
  },
  criticalDisabled: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: ColorPalette.brand.primaryDisabled,
  },
  criticalText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ColorPalette.grayscale.white,
  },
  primary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: ColorPalette.brand.primary,
  },
  primaryDisabled: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: ColorPalette.brand.primaryDisabled,
  },
  primaryText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    color: ColorPalette.brand.text,
    textAlign: 'center',
  },
  primaryTextDisabled: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    color: ColorPalette.brand.text,
    textAlign: 'center',
  },
  secondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: ColorPalette.brand.primary,
  },
  secondaryDisabled: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: ColorPalette.brand.secondaryDisabled,
  },
  secondaryText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    color: ColorPalette.brand.primary,
    textAlign: 'center',
  },
  secondaryTextDisabled: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    color: ColorPalette.brand.secondaryDisabled,
    textAlign: 'center',
  },
  modalCritical: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#D8292F',
  },
  modalCriticalText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ColorPalette.grayscale.white,
  },
  modalPrimary: {
    padding: 16,
    borderRadius: 4,
    backgroundColor: ColorPalette.brand.primary,
  },
  modalPrimaryText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ColorPalette.brand.text,
  },
  modalSecondary: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: ColorPalette.brand.primary,
  },
  modalSecondaryText: {
    ...TextTheme.normal,
    fontWeight: 'bold',
    color: ColorPalette.brand.primary,
    textAlign: 'center',
  },
})

export const ListItems: ITheme['ListItems'] = StyleSheet.create({
  credentialBackground: {
    backgroundColor: ColorPalette.brand.secondaryBackground,
  },
  credentialTitle: {
    ...TextTheme.headingFour,
  },
  credentialDetails: {
    ...TextTheme.caption,
  },
  credentialOfferBackground: {
    backgroundColor: ColorPalette.brand.modalPrimaryBackground,
  },
  credentialOfferTitle: {
    ...TextTheme.modalHeadingThree,
  },
  credentialOfferDetails: {
    ...TextTheme.normal,
  },
  revoked: {
    backgroundColor: ColorPalette.notification.error,
    borderColor: ColorPalette.notification.errorBorder,
  },
  contactBackground: {
    backgroundColor: ColorPalette.brand.secondaryBackground,
  },
  credentialIconColor: {
    color: ColorPalette.notification.infoText,
  },
  contactTitle: {
    fontFamily: TextTheme.title.fontFamily,
    color: ColorPalette.grayscale.darkGrey,
  },
  contactDate: {
    fontFamily: TextTheme.normal.fontFamily,
    color: ColorPalette.grayscale.darkGrey,
    marginTop: 10,
  },
  contactIconBackground: {
    backgroundColor: ColorPalette.brand.primary,
  },
  contactIcon: {
    color: ColorPalette.brand.text,
  },
  recordAttributeLabel: {
    ...TextTheme.bold,
  },
  recordContainer: {
    backgroundColor: ColorPalette.brand.secondaryBackground,
  },
  recordBorder: {
    borderBottomColor: ColorPalette.brand.primaryBackground,
  },
  recordLink: {
    color: ColorPalette.brand.link,
  },
  recordAttributeText: {
    ...TextTheme.normal,
  },
  proofIcon: {
    ...TextTheme.headingOne,
  },
  proofError: {
    color: ColorPalette.semantic.error,
  },
  proofListItem: {
    paddingHorizontal: 25,
    paddingTop: 16,
    backgroundColor: ColorPalette.brand.primaryBackground,
    borderTopColor: ColorPalette.brand.secondaryBackground,
    borderBottomColor: ColorPalette.brand.secondaryBackground,
    borderTopWidth: 2,
    borderBottomWidth: 2,
  },
  avatarText: {
    ...TextTheme.headingTwo,
    fontWeight: 'normal',
  },
  avatarCircle: {
    borderRadius: TextTheme.headingTwo.fontSize,
    borderColor: ColorPalette.grayscale.lightGrey,
    width: TextTheme.headingTwo.fontSize * 2,
    height: TextTheme.headingTwo.fontSize * 2,
  },
  emptyList: {
    ...TextTheme.normal,
  },
  requestTemplateBackground: {
    backgroundColor: ColorPalette.grayscale.white,
  },
  requestTemplateIconColor: {
    color: ColorPalette.notification.infoText,
  },
  requestTemplateTitle: {
    color: ColorPalette.grayscale.black,
    fontWeight: 'bold',
  },
  requestTemplateDetails: {
    color: ColorPalette.grayscale.black,
    fontWeight: 'normal',
  },
  requestTemplateZkpLabel: {
    color: ColorPalette.grayscale.mediumGrey,
  },
  requestTemplateIcon: {
    color: ColorPalette.grayscale.black,
  },
  requestTemplateDate: {
    color: ColorPalette.grayscale.mediumGrey,
  },
})

export const TabTheme: ITabTheme = {
  tabBarStyle: {
    height: 60,
    backgroundColor: ColorPalette.brand.secondaryBackground,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
    shadowColor: ColorPalette.grayscale.black,
    shadowOpacity: 0.1,
    borderTopWidth: 0,
    paddingBottom: 0,
  },
  tabBarContainerStyle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarActiveTintColor: ColorPalette.brand.primary,
  tabBarInactiveTintColor: ColorPalette.notification.infoText,
  tabBarTextStyle: {
    ...TextTheme.label,
    fontWeight: 'normal',
    paddingBottom: 5,
  },
  tabBarButtonIconStyle: {
    color: ColorPalette.grayscale.white,
  },
  focusTabIconStyle: {
    height: 60,
    width: 60,
    backgroundColor: ColorPalette.brand.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTabActiveTintColor: {
    backgroundColor: ColorPalette.brand.secondary,
  },
  tabBarSecondaryBackgroundColor: ColorPalette.brand.secondaryBackground,
}

export const NavigationTheme: ITheme['NavigationTheme'] = {
  dark: true,
  colors: {
    primary: ColorPalette.brand.primary,
    background: ColorPalette.brand.primaryBackground,
    card: ColorPalette.brand.primary,
    text: ColorPalette.brand.text,
    border: ColorPalette.grayscale.white,
    notification: ColorPalette.grayscale.white,
  },
}

export const HomeTheme: ITheme['HomeTheme'] = StyleSheet.create({
  welcomeHeader: {
    ...TextTheme.headingOne,
  },
  credentialMsg: {
    ...TextTheme.normal,
  },
  notificationsHeader: {
    ...TextTheme.headingThree,
  },
  noNewUpdatesText: {
    ...TextTheme.normal,
    color: ColorPalette.notification.infoText,
  },
  link: {
    ...TextTheme.normal,
    color: ColorPalette.brand.link,
  },
})

export const SettingsTheme = {
  groupHeader: {
    ...TextTheme.normal,
    marginBottom: 8,
  },
  groupBackground: ColorPalette.brand.secondaryBackground,
  iconColor: ColorPalette.grayscale.darkGrey,
  text: {
    ...TextTheme.caption,
    color: ColorPalette.grayscale.darkGrey,
  },
}

export const ChatTheme: ITheme['ChatTheme'] = {
  containerStyle: {
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'flex-end',
  },
  leftBubble: {
    backgroundColor: ColorPalette.brand.secondaryBackground,
    borderRadius: 4,
    padding: 16,
    marginLeft: 16,
  },
  rightBubble: {
    backgroundColor: ColorPalette.brand.primaryLight,
    borderRadius: 4,
    padding: 16,
    marginRight: 16,
  },
  timeStyleLeft: {
    color: ColorPalette.grayscale.black,
    fontSize: 12,
    marginTop: 8,
  },
  timeStyleRight: {
    color: ColorPalette.grayscale.black,
    fontSize: 12,
    marginTop: 8,
  },
  leftText: {
    color: ColorPalette.grayscale.black,
    fontSize: TextTheme.normal.fontSize,
  },
  leftTextHighlighted: {
    color: ColorPalette.grayscale.black,
    fontSize: TextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  rightText: {
    color: ColorPalette.grayscale.black,
    fontSize: TextTheme.normal.fontSize,
  },
  rightTextHighlighted: {
    color: ColorPalette.grayscale.black,
    fontSize: TextTheme.normal.fontSize,
    fontWeight: 'bold',
  },
  inputToolbar: {
    backgroundColor: ColorPalette.brand.secondary,
    shadowColor: ColorPalette.brand.primaryDisabled,
    borderRadius: 10,
  },
  inputText: {
    lineHeight: undefined,
    fontWeight: '500',
    fontSize: TextTheme.normal.fontSize,
    color: ColorPalette.brand.primary,
  },
  placeholderText: ColorPalette.grayscale.lightGrey,
  sendContainer: {
    marginBottom: 4,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  sendEnabled: ColorPalette.brand.primary,
  sendDisabled: ColorPalette.brand.primaryDisabled,
  options: ColorPalette.brand.primary,
  optionsText: ColorPalette.grayscale.black,
  openButtonStyle: {
    borderRadius: 32,
    backgroundColor: ColorPalette.brand.primary,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    marginTop: 16,
  },
  openButtonTextStyle: {
    color: ColorPalette.brand.secondary,
    fontSize: TextTheme.normal.fontSize,
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
    color: ColorPalette.grayscale.white,
  },
}

export const OnboardingTheme: ITheme['OnboardingTheme'] = {
  container: {
    backgroundColor: ColorPalette.brand.primaryBackground,
  },
  carouselContainer: {
    backgroundColor: ColorPalette.brand.primaryBackground,
  },
  pagerDot: {
    borderColor: ColorPalette.brand.primary,
  },
  pagerDotActive: {
    color: ColorPalette.brand.primary,
  },
  pagerDotInactive: {
    color: ColorPalette.brand.secondary,
  },
  pagerNavigationButton: {
    color: ColorPalette.brand.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTintColor: ColorPalette.grayscale.white,
  headerText: {
    ...TextTheme.headingTwo,
    color: ColorPalette.notification.infoText,
  },
  bodyText: {
    ...TextTheme.normal,
    color: ColorPalette.notification.infoText,
  },
  imageDisplayOptions: {
    fill: ColorPalette.notification.infoText,
  },
}

export const DialogTheme: ITheme['DialogTheme'] = {
  modalView: {
    backgroundColor: ColorPalette.brand.secondaryBackground,
  },
  titleText: {
    color: ColorPalette.grayscale.white,
  },
  description: {
    color: ColorPalette.grayscale.white,
  },
  closeButtonIcon: {
    color: ColorPalette.grayscale.white,
  },
  carouselButtonText: {
    color: ColorPalette.grayscale.white,
  },
}

export const LoadingTheme: ITheme['LoadingTheme'] = {
  backgroundColor: ColorPalette.brand.primary,
}

export const PINEnterTheme: ITheme['PINEnterTheme'] = {
  image: {
    alignSelf: 'center',
    marginBottom: 20,
  },
}
export const PINInputTheme: ITheme['PINInputTheme'] = {
  cell: {
    backgroundColor: ColorPalette.grayscale.lightGrey,
    borderColor: ColorPalette.grayscale.lightGrey,
  },
  focussedCell: {
    borderColor: '#3399FF',
  },
  cellText: {
    color: ColorPalette.grayscale.darkGrey,
  },
  icon: {
    color: ColorPalette.grayscale.darkGrey,
  },
  codeFieldRoot: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  labelAndFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: ColorPalette.grayscale.lightGrey,
    borderColor: ColorPalette.grayscale.lightGrey,
  },
}

export const Assets: IAssets = {
  ...BifoldImageAssets,
  svg: {
    ...BifoldImageAssets.svg,
    logo: Logo as React.FC,
    secureCheck: SecurePIN as React.FC,
  },
  img: {
    logoSecondary: {
      src: require('@assets/img/logo-large.png'),
      aspectRatio: 1,
      height: 120,
      width: 120,
      resizeMode: 'contain',
    },
    logoPrimary: {
      src: require('@assets/img/logo-large-white.png'),
      height: 170,
      width: 170,
    },
  },
}

export const InputInlineMessage: IInlineInputMessage = {
  inlineErrorText: { ...TextTheme.inlineErrorText },
  InlineErrorIcon: Assets.svg.iconError,
  inlineWarningText: { ...TextTheme.inlineWarningText },
  InlineWarningIcon: Assets.svg.iconWarning,
}

export const CredentialCardShadowTheme: ViewStyle = {
  shadowColor: ColorPalette.grayscale.black,
  shadowOffset: {
    width: 1,
    height: 1,
  },
  shadowOpacity: 0.3,
}

export const SelectedCredTheme: ViewStyle = {
  borderWidth: 5,
  borderRadius: 15,
  borderColor: ColorPalette.semantic.focus,
}

export const BCWalletTheme: ITheme = {
  themeName: BCThemeNames.BCWallet,
  Spacing,
  ColorPalette,
  TextTheme,
  Buttons,
  heavyOpacity,
  borderRadius,
  borderWidth,
  Inputs,
  ListItems,
  TabTheme,
  NavigationTheme,
  HomeTheme,
  SettingsTheme,
  ChatTheme,
  OnboardingTheme,
  DialogTheme,
  LoadingTheme,
  PINEnterTheme,
  PINInputTheme,
  Assets,
  InputInlineMessage,
  CredentialCardShadowTheme,
  SelectedCredTheme,
  maxFontSizeMultiplier,
}
