import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Trans, useTranslation } from 'react-i18next'
import React from 'react'
interface BoldedBulletPointProps {
  translationKey: string
  iconSize?: number
  iconColor?: string
}

const BulletPointWithText: React.FC<BoldedBulletPointProps> = ({ translationKey, iconSize, iconColor }) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      alignContent: 'center',
    },
    iconContainer: {
      margin: Spacing.sm,
    },
  })

  return (
    <View style={styles.container}>
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
