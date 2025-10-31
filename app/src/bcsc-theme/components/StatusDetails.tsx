import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type StatusScreenProps = {
  iconName?: string
  iconColor?: string
  iconSize?: number
  title: string
  description?: string
  bullets?: string[]
  extraText?: string
  buttonText: string
  onButtonPress: () => void
}

const StatusDetails: React.FC<StatusScreenProps> = ({
  iconName = 'check',
  iconColor,
  iconSize = 108,
  title,
  description,
  bullets,
  extraText,
  buttonText,
  onButtonPress,
}) => {
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
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
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey(buttonText)}
          accessibilityLabel={buttonText}
          title={buttonText}
          buttonType={ButtonType.Primary}
          onPress={onButtonPress}
        />
      </View>
    </SafeAreaView>
  )
}

export default StatusDetails
