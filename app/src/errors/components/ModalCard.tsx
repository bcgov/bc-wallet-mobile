import React, { PropsWithChildren, useMemo } from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

// This card is used outside the theme provider in many cases and has style requirements
// that the current theme doesn't support well, so we define the colours here
export const colors = {
  cardBackground: '#FFFFFF',
  cardBorder: '#D3D3D3',
  shadow: '#000000',
  icon: '#313132',
  errorIcon: '#D8292F',
  infoIcon: '#003366',
  text: '#313132',
  textSecondary: '#606060',
  link: '#003366',
  primaryButton: '#003366',
  primaryButtonDisabled: '#757575',
  primaryButtonText: '#FFFFFF',
  primaryButtonTextDisabled: '#FFFFFF',
  successIcon: '#89CE00',
  secondaryButtonBackground: '#FFFFFF',
  secondaryButtonBorder: '#003366',
  secondaryButtonText: '#003366',
  destructiveButton: '#D8292F',
  destructiveButtonText: '#FFFFFF',
}

/** Share of the window height the card may take, so the overlay stays visible above and below it. */
export const MAX_CARD_HEIGHT_RATIO = 0.85

export interface ModalCardProps extends PropsWithChildren {
  title: string
  titleTestID: string
  /** Rendered left of the title, e.g. the error icon */
  icon?: React.ReactNode
  /** Rendered right of the title, e.g. the error card's close button */
  headerRight?: React.ReactNode
}

/**
 * The card inside BCSCAlertModal, shared by ErrorInfoCard and AlertCard: sizing, frame and title row.
 * The body scrolls inside the card, so long content never pushes the title row off screen.
 */
export const ModalCard: React.FC<ModalCardProps> = ({ title, titleTestID, icon, headerRight, children }) => {
  const { width, height } = useWindowDimensions()

  const containerStyle = useMemo(
    () => ({
      minWidth: width - 50,
      maxWidth: width - 50,
      maxHeight: height * MAX_CARD_HEIGHT_RATIO,
    }),
    [width, height]
  )

  return (
    <View style={containerStyle}>
      <View style={modalCardStyles.card} accessibilityViewIsModal>
        <View style={modalCardStyles.header}>
          {icon}
          <View style={modalCardStyles.headerTextContainer}>
            <Text style={modalCardStyles.titleText} accessibilityRole="header" testID={titleTestID}>
              {title}
            </Text>
          </View>
          {headerRight}
        </View>

        <ScrollView style={modalCardStyles.body} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  )
}

const baseButton = {
  borderRadius: 4,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: 'center',
  justifyContent: 'center',
} as const

const baseButtonText = { fontSize: 16, fontWeight: '600' } as const

// The frame plus the body text and buttons both cards use
export const modalCardStyles = StyleSheet.create({
  card: {
    flexShrink: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  icon: {
    marginRight: 10,
    alignSelf: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignSelf: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    marginTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 16,
    color: colors.text,
    marginVertical: 8,
    lineHeight: 24,
  },
  buttons: {
    paddingTop: 8,
    gap: 8,
  },
  primaryButton: {
    ...baseButton,
    backgroundColor: colors.primaryButton,
  },
  primaryButtonText: {
    ...baseButtonText,
    color: colors.primaryButtonText,
  },
  secondaryButton: {
    ...baseButton,
    backgroundColor: colors.secondaryButtonBackground,
    borderWidth: 1.5,
    borderColor: colors.secondaryButtonBorder,
  },
  secondaryButtonText: {
    ...baseButtonText,
    color: colors.secondaryButtonText,
  },
  destructiveButton: {
    ...baseButton,
    backgroundColor: colors.destructiveButton,
  },
  destructiveButtonText: {
    ...baseButtonText,
    color: colors.destructiveButtonText,
  },
})
