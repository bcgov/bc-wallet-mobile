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
  extraText?: string
}

const StatusDetails: React.FC<StatusScreenProps> = ({
  iconName = 'check',
  iconColor,
  iconSize = 108,
  title,
  description,
  bullets,
  extraText,
}) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  return (
    <>
      <Icon name={iconName} size={iconSize} color={iconColor ?? ColorPalette.brand.primary} />
      <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.md, textAlign: 'center' }}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant={'headingFour'} style={{ marginVertical: Spacing.lg, textAlign: 'center' }}>
          {description}
        </ThemedText>
      ) : null}
      {bullets?.map((bullet) => (
        <View style={styles.bulletContainer} key={bullet}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{bullet}</ThemedText>
        </View>
      ))}
      {extraText ? (
        <ThemedText style={{ marginBottom: Spacing.md, textAlign: 'center' }}>{extraText}</ThemedText>
      ) : null}
    </>
  )
}

export default StatusDetails
