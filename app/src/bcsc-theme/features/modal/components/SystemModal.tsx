import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

export interface SystemModalProps {
  /**
   * Name of the MaterialIcons icon to display
   */
  iconName?: string
  /**
   * Size of the icon (default: 200)
   */
  iconSize?: number
  /**
   * Header text
   */
  headerText: string
  /**
   * Content text
   */
  contentText: string[]
  /**
   * Button text
   */
  buttonText: string
  /**
   * Callback function when the button is pressed
   */
  onButtonPress: () => void | Promise<void>
  /**
   * Whether the button is disabled
   */
  buttonDisabled?: boolean
  /**
   * Optional testID for the button
   */
  testID?: string
}

/**
 * A reusable modal component for system-related messages (device invalidated, internet disconnected, mandatory update, etc.)
 *
 * @param {SystemModalProps} props - The component props
 * @returns {React.ReactElement} The SystemModal component
 */
export const SystemModal = ({
  iconName,
  iconSize = 200,
  headerText,
  contentText,
  buttonText,
  onButtonPress,
  buttonDisabled,
  testID,
}: SystemModalProps): React.ReactElement => {
  const { Spacing, ColorPalette } = useTheme()

  usePreventGestureBack()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scollContainer: {
      alignItems: 'center',
    },
    icon: {
      paddingVertical: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        {iconName ? <Icon name={iconName} size={iconSize} color={ColorPalette.brand.icon} style={styles.icon} /> : null}
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{headerText}</ThemedText>
          {contentText.filter(Boolean).map((text) => (
            <ThemedText key={text} style={styles.textContent}>
              {text}
            </ThemedText>
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={buttonText}
          buttonType={ButtonType.Primary}
          onPress={onButtonPress}
          disabled={buttonDisabled}
          accessibilityLabel={buttonText}
          testID={testID ?? testIdWithKey('SystemModalButton')}
        />
      </View>
    </SafeAreaView>
  )
}
