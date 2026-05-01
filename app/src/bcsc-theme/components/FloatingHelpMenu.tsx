import { PressableOpacity } from '@/components/PressableOpacity'
import { hitSlop, SHADOW_COLOR, SHADOW_RADIUS } from '@/constants'
import { ThemedText, useTheme } from '@bifold/core'
import { PropsWithChildren, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Easing, Modal, StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import { getVersion } from 'react-native-device-info'
import DropShadow from 'react-native-drop-shadow'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

const ANIMATION_DURATION = 300
const MENU_MIN_WIDTH = 200
const DEFAULT_TRANSLATE_X = 600

const AnimatedDropShadow = Animated.createAnimatedComponent(DropShadow)

interface FloatingHelpMenuProps extends PropsWithChildren {
  open: boolean
  onClose: () => void
}

/**
 * A floating help menu component that slides open and closed with an animation.
 *
 * @param props - The props for the FloatingHelpMenu component, including:
 *  - open: A boolean indicating whether the menu is open or closed.
 *  - onClose: A callback function to be called when the menu is closed.
 *  - children: The content to be displayed inside the menu.
 * @returns A React element representing the FloatingHelpMenu component.
 */
const FloatingHelpMenu = (props: FloatingHelpMenuProps) => {
  const { t } = useTranslation()
  const { top } = useSafeAreaInsets()
  const { Spacing, ColorPalette } = useTheme()
  const translateX = useRef(new Animated.Value(DEFAULT_TRANSLATE_X)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const styles = StyleSheet.create({
    root: {
      flex: 1,
    },
    floatingMenuContainer: {
      position: 'absolute',
      top: top,
      right: 0,
      bottom: 0,
      maxWidth: '80%',
    },
    container: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      shadowColor: SHADOW_COLOR,
      shadowOpacity: 0.4,
      shadowRadius: SHADOW_RADIUS,
      shadowOffset: { width: 0, height: 2 },
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      padding: Spacing.md,
      gap: Spacing.md,
      minWidth: MENU_MIN_WIDTH,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    versionContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    childrenContainer: {
      flexDirection: 'row',
    },
  })

  const animateTransition = useCallback(
    (toValue: number, onFinished?: () => void) => {
      // Cancel any in-flight animation before starting a new one
      animationRef.current?.stop()

      const isClosing = toValue !== 0
      const easing = isClosing ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic)
      const duration = isClosing ? ANIMATION_DURATION / 2 : ANIMATION_DURATION

      animationRef.current = Animated.timing(translateX, {
        toValue,
        duration,
        easing,
        useNativeDriver: false,
      })

      animationRef.current.start(({ finished }) => {
        if (finished) {
          onFinished?.()
        }
      })
    },
    [translateX]
  )

  const handleClose = () => {
    animateTransition(DEFAULT_TRANSLATE_X, props.onClose)
  }

  const handleShow = () => {
    translateX.setValue(DEFAULT_TRANSLATE_X) // Ensure menu starts off-screen when opened
    animateTransition(0)
  }

  return (
    <Modal visible={props.open} onShow={handleShow} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose} accessible={false}>
        <View style={styles.root}>
          <View style={styles.floatingMenuContainer}>
            <AnimatedDropShadow style={[styles.container, { transform: [{ translateX }] }]}>
              <View style={styles.headerContainer}>
                <PressableOpacity onPress={handleClose} hitSlop={hitSlop}>
                  <Icon name="close" size={24} color={ColorPalette.brand.headerText} />
                </PressableOpacity>
                <ThemedText variant="headingFour">{t('BCSC.HelpMenu.Title')}</ThemedText>
              </View>
              <View style={styles.childrenContainer}>{props.children}</View>
              <View style={styles.versionContainer}>
                <ThemedText>{t('BCSC.HelpMenu.Version', { version: getVersion() })}</ThemedText>
              </View>
            </AnimatedDropShadow>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

export default FloatingHelpMenu
