import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'

interface HomeHeaderProps {
  name: string
  fontSize?: number
  cardSize?: {
    height: number
    width: number
  }
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ name, cardSize, fontSize }) => {
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
    },
    idContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.idContainer}>
        <GenericCardImage height={cardSize?.height} width={cardSize?.width} />
        <ThemedText variant={'headingThree'} style={[fontSize ? { fontSize: fontSize } : {}]}>
          {name}
        </ThemedText>
      </View>
    </View>
  )
}

export default HomeHeader
