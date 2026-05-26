import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
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
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignContent: 'center',
    },
    iconContainer: {
      marginHorizontal: Spacing.sm,
      height: TextTheme.normal.lineHeight,
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
