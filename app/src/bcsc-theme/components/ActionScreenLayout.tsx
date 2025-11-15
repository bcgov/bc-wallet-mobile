import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { PropsWithChildren } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface PrimaryActionScreenLayoutProps extends PropsWithChildren {
  primaryActionText: string
  onPressPrimaryAction: () => void
  secondaryActionText?: undefined
  onPressSecondaryAction?: undefined
}

interface WithSecondaryActionScreenLayoutProps extends PropsWithChildren {
  primaryActionText: string
  onPressPrimaryAction: () => void
  secondaryActionText: string
  onPressSecondaryAction: () => void
}

type ActionScreenLayoutProps = PrimaryActionScreenLayoutProps | WithSecondaryActionScreenLayoutProps

/**
 * Screen layout component (SafeAreaView+ScrollView) with primary and optional secondary action buttons at the bottom.
 *
 * @param {ActionScreenLayoutProps} props - The properties for the ActionScreenLayout component.
 * @returns {*} {JSX.Element} The ActionScreenLayout component.
 */
export const ActionScreenLayout = (props: ActionScreenLayoutProps): JSX.Element => {
  const { Spacing } = useTheme()

  const { primaryActionText, onPressPrimaryAction, secondaryActionText, onPressSecondaryAction, children } = props

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
      gap: Spacing.sm,
    },
  })

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>{children}</ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={primaryActionText}
          buttonType={ButtonType.Primary}
          onPress={onPressPrimaryAction}
          testID={testIdWithKey(primaryActionText)}
          accessibilityLabel={primaryActionText}
        />

        {onPressSecondaryAction ? (
          <Button
            title={secondaryActionText}
            buttonType={ButtonType.Secondary}
            onPress={onPressSecondaryAction}
            testID={testIdWithKey(secondaryActionText)}
            accessibilityLabel={secondaryActionText}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}
