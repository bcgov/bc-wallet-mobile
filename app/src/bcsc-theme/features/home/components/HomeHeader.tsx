import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface HomeHeaderProps {
  name: string
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ name }) => {
  const { Spacing, TextTheme } = useTheme()

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
        <Icon name={'card-account-details'} size={40} color={TextTheme.normal.color} />
        <ThemedText variant={'headingThree'}>{name}</ThemedText>
      </View>
    </View>
  )
}

export default HomeHeader
