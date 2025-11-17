import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

export interface SystemModalProps {
  /**
   * Name of the MaterialIcons icon to display
   */
  iconName: string
  /**
   * Size of the icon (default: 200)
   */
  iconSize?: number
  /**
   * Translation key for the header text
   */
  headerKey: string
  /**
   * Array of translation keys for content paragraphs
   */
  contentKeys: string[]
  /**
   * Translation key for the button title
   */
  buttonTitleKey: string
  /**
   * Callback function when the button is pressed
   */
  onButtonPress: () => void | Promise<void>
  /**
   * Optional parameters for translation interpolation
   */
  translationParams?: Record<string, string | number>
}

/**
 * A reusable modal component for system-related messages (device invalidated, internet disconnected, mandatory update, etc.)
 *
 * @param {SystemModalProps} props - The component props
 * @returns {JSX.Element} The SystemModal component
 */
export const SystemModal = ({
  iconName,
  iconSize = 200,
  headerKey,
  contentKeys,
  buttonTitleKey,
  onButtonPress,
  translationParams,
}: SystemModalProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const navigation = useNavigation()
  const allowNavigationRef = useRef(false)

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

  /**
   * Prevents the user from navigating back to the previous screen on Android,
   * but allows programmatic navigation (e.g., when button is pressed).
   * Note: gestureEnabled: false works for iOS, but Android requires this listener.
   */
  useFocusEffect(
    useCallback(() => {
      const beforeRemove = navigation.addListener('beforeRemove', (event) => {
        if (allowNavigationRef.current) {
          allowNavigationRef.current = false
          return
        }
        event.preventDefault()
      })
      return () => {
        beforeRemove()
      }
    }, [navigation])
  )

  /**
   * Wraps the onButtonPress handler to allow programmatic navigation.
   */
  const handleButtonPress = useCallback(async () => {
    allowNavigationRef.current = true
    await onButtonPress()
  }, [onButtonPress])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name={iconName} size={iconSize} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{t(headerKey, translationParams)}</ThemedText>
          {contentKeys.map((key) => (
            <ThemedText key={key} style={styles.textContent}>
              {t(key, translationParams)}
            </ThemedText>
          ))}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t(buttonTitleKey, translationParams)}
          buttonType={ButtonType.Primary}
          onPress={handleButtonPress}
        />
      </View>
    </SafeAreaView>
  )
}
