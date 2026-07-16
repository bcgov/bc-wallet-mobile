import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StyleSheet } from 'react-native'
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
    content: {
      // flexGrow lets the content fill the viewport so the controls stay pinned to the bottom.
      flexGrow: 1,
      padding: Spacing.lg,
      // Consistent vertical rhythm between the icon, heading and body lines.
      gap: Spacing.lg,
    },
    icon: {
      alignSelf: 'center',
      marginBottom: Spacing.sm,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        title={buttonText}
        buttonType={ButtonType.Primary}
        onPress={onButtonPress}
        disabled={buttonDisabled}
        accessibilityLabel={buttonText}
        testID={testID ?? testIdWithKey('SystemModalButton')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.content}
    >
      {iconName ? <Icon name={iconName} size={iconSize} color={ColorPalette.brand.icon} style={styles.icon} /> : null}
      <ThemedText variant="headingThree">{headerText}</ThemedText>
      {contentText.filter(Boolean).map((text, index) => (
        <ThemedText key={index}>{text}</ThemedText>
      ))}
    </ScreenWrapper>
  )
}
