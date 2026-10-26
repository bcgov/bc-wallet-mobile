import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { TestIds } from '@/test-ids/registry'
import {
  CredentialStack,
  OpenIDCredentialRecordProvider,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useDefaultStackOptions,
  useServices,
  useTheme,
} from '@bifold/core'
import { BottomTabBar, BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
import { createFloatingHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createTabHeader } from '../components/NavigationHeaders'
import { createMainSettingsHeaderButton } from '../components/SettingsHeaderButton'
import { AgentReadyGate, CredentialsReadyGate } from '../features/agent'
import Home from '../features/home/Home'
import { FloatingScanButton } from '../features/scan'
import Services from '../features/services/Services'
import { useCardStatus } from '../hooks/useCardStatus'
import { BCSCMainStackParams, BCSCModals, BCSCScreens, BCSCStacks, BCSCTabStackParams } from '../types/navigators'

const ScopedCredentialStack: React.FC = () => (
  <AgentReadyGate testID={testIdWithKey(TestIds.main.wallet.loading)}>
    <OpenIDCredentialRecordProvider>
      <CredentialsReadyGate testID={testIdWithKey(TestIds.main.wallet.loading)}>
        <CredentialStack />
      </CredentialsReadyGate>
    </OpenIDCredentialRecordProvider>
  </AgentReadyGate>
)

type TabBarIconProps = {
  focused: boolean
  color: string
  size: number
}

const createTabBarIcon = (label: string, iconName: string) => {
  const TabBarIconComponent = ({ focused }: TabBarIconProps): React.JSX.Element => {
    const { TabTheme, TextTheme, Spacing } = useTheme()
    const { fontScale } = useWindowDimensions()
    const showLabels = fontScale * TabTheme.tabBarTextStyle.fontSize < 18

    const Icon = MaterialIcon.hasIcon(iconName) ? MaterialIcon : CommunityIcon

    return (
      <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
        <Icon
          name={iconName}
          size={Spacing.lg}
          color={focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor}
        />
        {showLabels && (
          <ThemedText
            variant={'labelSubtitle'}
            style={{
              ...TabTheme.tabBarTextStyle,
              color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
              fontFamily: focused ? TextTheme.bold.fontFamily : TextTheme.normal.fontFamily, // BCSans-Regular -> BCSans-Bold
            }}
          >
            {label}
          </ThemedText>
        )}
      </View>
    )
  }

  return TabBarIconComponent
}

const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 })

// React Navigation's tab badge is an uncapped Animated.Text inside a fixed box (3/4 of the 25pt icon).
// The digits follow the OS font scale but the box does not, so the count is clipped at large sizes.
// `tabBarBadgeStyle` is applied last, so size the box for the capped scale and bring the text back down
// to that same cap (RN multiplies fontSize and lineHeight by the raw fontScale).
const TAB_BADGE_SIZE = (25 * 3) / 4

export const getTabBarBadgeStyle = (fontScale: number, maxFontSizeMultiplier: number, backgroundColor: string) => {
  const scale = Math.min(fontScale, maxFontSizeMultiplier)
  const size = TAB_BADGE_SIZE * scale
  const textScale = scale / fontScale

  return {
    backgroundColor,
    height: size,
    minWidth: size,
    borderRadius: size / 2,
    fontSize: Math.floor((TAB_BADGE_SIZE * 3) / 4) * textScale,
    lineHeight: (TAB_BADGE_SIZE - 1) * textScale,
  }
}
const ACTIVE_INDICATOR_HEIGHT = 3
const ACTIVE_INDICATOR_DURATION_MS = 100

type AnimatedTabBarProps = BottomTabBarProps & {
  /**
   * Reports the tab that is actually focused. The navigator's own state is the only reliable
   * source for this: a `tabPress` that gets `preventDefault()`ed (the unverified Services gate)
   * never changes the focused tab, and back navigation changes it without any press at all.
   */
  onActiveTabChange: (routeName: string) => void
}

const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({ onActiveTabChange, ...props }) => {
  const { ColorPalette } = useTheme()
  const { state } = props
  const tabCount = state.routes.length
  const { width: windowWidth } = useWindowDimensions()
  const tabWidth = windowWidth / tabCount
  const indicatorWidth = tabWidth * 0.8
  const indicatorOffset = (tabWidth - indicatorWidth) / 2
  const translateX = useRef(new Animated.Value(state.index * tabWidth + indicatorOffset)).current
  const activeTabName = state.routes[state.index]?.name

  useEffect(() => {
    if (activeTabName) {
      onActiveTabChange(activeTabName)
    }
  }, [activeTabName, onActiveTabChange])

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: state.index * tabWidth + indicatorOffset,
      duration: ACTIVE_INDICATOR_DURATION_MS,
      useNativeDriver: true,
    }).start()
  }, [state.index, tabWidth, indicatorOffset, translateX])

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: indicatorWidth,
          height: ACTIVE_INDICATOR_HEIGHT,
          backgroundColor: ColorPalette.brand.highlight,
          transform: [{ translateX }],
          zIndex: 1,
        }}
      />
      <BottomTabBar {...props} />
    </View>
  )
}

/**
 * Builds the navigator's `tabBar` renderer. A factory rather than an inline arrow so the component
 * isn't redefined inside {@link BCSCTabStack} on every render, which would remount the tab bar and
 * restart its indicator animation.
 *
 * @param onActiveTabChange - Called with the route name of the tab the navigator has focused.
 * @returns A React component that renders the animated tab bar.
 */
const createAnimatedTabBar = (onActiveTabChange: (routeName: string) => void) => {
  const AnimatedTabBarRenderer = (props: BottomTabBarProps): React.JSX.Element => (
    <AnimatedTabBar {...props} onActiveTabChange={onActiveTabChange} />
  )

  return AnimatedTabBarRenderer
}

const BCSCTabStack: React.FC = () => {
  const Tab = createBottomTabNavigator<BCSCTabStackParams>()
  const theme = useTheme()
  const notifications = useNotifications()
  const { customNotifications } = useCustomNotifications()
  const [activeTab, setActiveTab] = useState<string>(BCSCScreens.Home)
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { bottom: safeAreaBottom } = useSafeAreaInsets()
  const { t } = useTranslation()
  const { isActivelyVerified, isExpired } = useCardStatus()
  const { isAvailable: isServerAvailable } = useServerStatus()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const defaultStackOptions = useDefaultStackOptions(theme)
  // `setActiveTab` is a stable state setter, so the tab bar component is built once per mount.
  const tabBar = useMemo(() => createAnimatedTabBar(setActiveTab), [])

  /**
   * Redirects away from the Services tab when there is a server outage.
   *
   * @returns Whether a redirect was made so the caller can decide to `preventDefault()`
   */
  const redirectFromServicesTab = useCallback((): boolean => {
    if (isServerAvailable && isActivelyVerified) {
      return false
    }

    navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })

    if (!isServerAvailable) {
      logger.debug('[BCSCTabStack] Server unavailable, redirecting to ServiceOutage screen')
      navigation.navigate(BCSCModals.ServiceOutage, {})
    } else if (isExpired) {
      logger.debug('[BCSCTabStack] User is expired, redirecting to Expired screen')
      navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired })
    } else {
      logger.debug('[BCSCTabStack] User is not verified, redirecting to VerifyPrompt screen')
      navigation.navigate(BCSCScreens.MainVerifyPrompt)
    }

    return true
  }, [isServerAvailable, isActivelyVerified, isExpired, logger, navigation])

  const { TabTheme, ColorPalette, Spacing, maxFontSizeMultiplier } = theme
  const { fontScale } = useWindowDimensions()

  const homeNotificationsBadgeCount = customNotifications.length + notifications.length || undefined

  const handleScanPress = useCallback(() => {
    navigation.navigate(BCSCScreens.QRCore)
  }, [navigation])

  // this style should be moved to the theme file here and in Bifold
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
    fabContainer: {
      position: 'absolute',
      bottom: safeAreaBottom + TAB_BAR_HEIGHT + Spacing.md,
      right: Spacing.lg,
    },
  })

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenListeners={({ route }) => ({
          focus: () => {
            if (route.name === BCSCScreens.Services) {
              redirectFromServicesTab()
            }
          },
          tabPress: (event) => {
            if (route.name === BCSCScreens.Services && redirectFromServicesTab()) {
              event.preventDefault() // Prevents navigation to the Services tab
            }
          },
        })}
        initialRouteName={BCSCScreens.Home}
        tabBar={tabBar}
        screenOptions={{
          ...defaultStackOptions,
          // Show the header's own (native) shadow. TabHeader draws no drop-shadow caster,
          // so this native shadow — tuned via HEADER_SHADOW — is the single header shadow.
          headerShadowVisible: true,
          unmountOnBlur: false,
          lazy: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarBadgeStyle: getTabBarBadgeStyle(fontScale, maxFontSizeMultiplier, ColorPalette.notification.errorIcon),
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          header: createTabHeader,
          headerRight: createFloatingHelpMenuButton({ webViewScreen: BCSCScreens.MainWebView }),
        }}
      >
        <Tab.Screen
          name={BCSCScreens.Home}
          component={Home}
          options={{
            title: t('BCSC.Home.Title'),
            headerTitleAlign: 'center',
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('BCSC.Home.Title'), 'home-outline'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.Home.Title'),
            tabBarTestID: testIdWithKey(TestIds.main.tabBar.home),
            tabBarBadge: homeNotificationsBadgeCount,
            headerLeft: createMainSettingsHeaderButton(),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Services}
          component={Services}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('BCSC.Services.Title'), 'list-alt'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.Services.Title'),
            tabBarTestID: testIdWithKey(TestIds.main.tabBar.services),
            headerLeft: createMainSettingsHeaderButton(),
            title: t('BCSC.Services.Title'),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Wallet}
          component={ScopedCredentialStack}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('BCSC.Wallet.Title'), 'wallet'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.Wallet.Title'),
            tabBarTestID: testIdWithKey(TestIds.main.tabBar.wallet),
            headerLeft: createMainSettingsHeaderButton(),
            headerShown: true,
          }}
        />
      </Tab.Navigator>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
      <View style={styles.fabContainer} pointerEvents="box-none">
        <FloatingScanButton activeTabName={activeTab} onPress={handleScanPress} />
      </View>
    </View>
  )
}

export default BCSCTabStack
