import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface BoldedBulletPointProps {
  translationKey: string
  iconSize?: number
  iconColor?: string
  containerStyle?: StyleProp<ViewStyle>
}

const BulletPointWithText: React.FC<BoldedBulletPointProps> = ({
  translationKey,
  iconSize,
  iconColor,
  containerStyle,
}) => {
  const { ColorPalette, Spacing, TextTheme, maxFontSizeMultiplier } = useTheme()
  const { t } = useTranslation()
  const { fontScale } = useWindowDimensions()

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignContent: 'center',
    },
    iconContainer: {
      marginHorizontal: Spacing.sm,
      // The rendered height of the first text line, so the dot stays centred on it at every OS font size
      height: (TextTheme.normal.lineHeight ?? Spacing.lg) * Math.min(fontScale, maxFontSizeMultiplier),
      justifyContent: 'center',
    },
  })

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.iconContainer}>
        <Icon name={'circle'} size={iconSize ?? Spacing.sm} color={iconColor ?? ColorPalette.brand.modalIcon} />
      </View>
      <ThemedText style={{ flexShrink: 1 }}>
        <Trans
          i18nKey={translationKey}
          components={{
            b: <ThemedText variant="bold" />,
          }}
          t={t}
        />
      </ThemedText>
    </View>
  )
}

export default BulletPointWithText
