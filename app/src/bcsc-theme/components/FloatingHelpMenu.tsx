import { PressableOpacity } from '@/components/PressableOpacity'
import { hitSlop, SHADOW_COLOR, SHADOW_RADIUS } from '@/constants'
import { ThemedText, useTheme } from '@bifold/core'
import { PropsWithChildren, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { getVersion } from 'react-native-device-info'
import DropShadow from 'react-native-drop-shadow'
import Icon from 'react-native-vector-icons/MaterialIcons'

const ANIMATION_DURATION = 300
const MENU_MIN_WIDTH = 200

const AnimatedDropShadow = Animated.createAnimatedComponent(DropShadow)

interface FloatingHelpMenuProps extends PropsWithChildren {
  onClose: () => void
}

/**
 * A floating help menu component that can be used across the app.
 *
 */
const FloatingHelpMenu = (props: FloatingHelpMenuProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const translateX = useRef(new Animated.Value(MENU_MIN_WIDTH)).current
  const isAnimating = useRef(false)

  const styles = StyleSheet.create({
    container: {
      top: 0,
      position: 'absolute',
      backgroundColor: ColorPalette.brand.primaryBackground,
      shadowColor: SHADOW_COLOR,
      shadowOpacity: 0.5,
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
    },
    versionContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    childrenContainer: {
      flexDirection: 'row',
    },
  })

  useEffect(() => {
    isAnimating.current = true
    Animated.timing(translateX, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        isAnimating.current = false
      }
    })
  }, [translateX])

  return (
    <AnimatedDropShadow style={[styles.container, { transform: [{ translateX }] }]}>
      <View style={styles.headerContainer}>
        <PressableOpacity
          onPress={() => {
            if (isAnimating.current) {
              return
            }

            props.onClose()
          }}
          hitSlop={hitSlop}
        >
          <Icon name="close" size={24} color={ColorPalette.brand.headerText} />
        </PressableOpacity>
        <ThemedText variant="headingFour">{t('BCSC.HelpMenu.Title')}</ThemedText>
      </View>
      <View style={styles.childrenContainer}>{props.children}</View>
      <View style={styles.versionContainer}>
        <ThemedText>{t('BCSC.HelpMenu.Version', { version: getVersion() })}</ThemedText>
      </View>
    </AnimatedDropShadow>
  )
}

export default FloatingHelpMenu
