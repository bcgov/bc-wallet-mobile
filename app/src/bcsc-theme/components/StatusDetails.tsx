import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type StatusScreenProps = {
  iconName?: string
  iconColor?: string
  iconSize?: number
  title: string
  description?: string
  bullets?: string[]
  description2?: string
  description3?: string
}

const StatusDetails: React.FC<StatusScreenProps> = ({
  iconName = 'check',
  iconColor,
  iconSize = 108,
  title,
  bullets,
  description,
  description2,
  description3,
}) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    bulletContainer: { width: '100%', marginBottom: Spacing.lg, marginLeft: Spacing.lg },
    bulletItemContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
    descriptions: {
      width: '100%',
      marginBottom: Spacing.md,
      textAlign: 'left',
    },
  })

  return (
    <>
      <Icon
        name={iconName}
        size={iconSize}
        color={iconColor ?? ColorPalette.brand.primary}
        style={{ padding: Spacing.lg }}
      />
      <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md, textAlign: 'left' }}>
        {title}
      </ThemedText>
      {description ? <ThemedText style={styles.descriptions}>{description}</ThemedText> : null}
      <View style={styles.bulletContainer}>
        {bullets?.map((bullet) => (
          <View style={styles.bulletItemContainer} key={bullet}>
            <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
            <ThemedText>{bullet}</ThemedText>
          </View>
        ))}
      </View>

      {description2 ? <ThemedText style={styles.descriptions}>{description2}</ThemedText> : null}
      {description3 ? <ThemedText style={styles.descriptions}>{description3}</ThemedText> : null}
    </>
  )
}

export default StatusDetails
