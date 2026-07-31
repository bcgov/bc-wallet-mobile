import { useNotifications } from '@/hooks/notifications'
import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import {
  CredentialStack,
  OpenIDCredentialRecordProvider,
  testIdWithKey,
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
import { Animated, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
import { createFloatingHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createTabHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createMainSettingsHeaderButton } from '../components/SettingsHeaderButton'
import { AgentReadyGate, CredentialsReadyGate } from '../features/agent'
import Home from '../features/home/Home'
import { FloatingScanButton } from '../features/scan'
import Services from '../features/services/Services'
import { useCardStatus } from '../hooks/useCardStatus'
import { BCSCMainStackParams, BCSCScreens, BCSCTabStackParams } from '../types/navigators'

const ScopedCredentialStack: React.FC = () => (
  <AgentReadyGate testID={testIdWithKey('Wallet.Loading')}>
    <OpenIDCredentialRecordProvider>
      <CredentialsReadyGate testID={testIdWithKey('Wallet.Loading')}>
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
          <Text
            style={{
              ...TabTheme.tabBarTextStyle,
              color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
              fontFamily: focused ? TextTheme.bold.fontFamily : TextTheme.normal.fontFamily, // BCSans-Regular -> BCSans-Bold
            }}
          >
            {label}
          </Text>
        )}
      </View>
    )
  }

  return TabBarIconComponent
}

const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 })
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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const defaultStackOptions = useDefaultStackOptions(theme)
  // `setActiveTab` is a stable state setter, so the tab bar component is built once per mount.
  const tabBar = useMemo(() => createAnimatedTabBar(setActiveTab), [])

  const { TabTheme, ColorPalette, Spacing } = theme

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
            // Hijack the focus event for the Services tab if the user is not verified
            if (route.name === BCSCScreens.Services && !isActivelyVerified) {
              if (isExpired) {
                logger.debug('[BCSCTabStack] User is expired, redirecting to Expired screen')
                navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired })
              } else {
                logger.debug('[BCSCTabStack] User is not verified, redirecting to VerifyPrompt screen')
                navigation.navigate(BCSCScreens.MainVerifyPrompt)
              }
              return
            }
          },
          tabPress: (event) => {
            // Hijack the tab press event for the Services tab if the user is not verified
            if (route.name === BCSCScreens.Services && !isActivelyVerified) {
              event.preventDefault() // Prevents navigation to the Services tab
              if (isExpired) {
                logger.debug('[BCSCTabStack] User is expired, redirecting to Expired screen')
                navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired })
              } else {
                logger.debug('[BCSCTabStack] User is not verified, redirecting to VerifyPrompt screen')
                navigation.navigate(BCSCScreens.MainVerifyPrompt)
              }
            }
          },
        })}
        initialRouteName={BCSCScreens.Home}
        tabBar={tabBar}
        screenOptions={{
          ...defaultStackOptions,
          // Show the header's own (native) shadow. TabHeaderWithoutBanner draws no drop-shadow caster,
          // so this native shadow — tuned via HEADER_SHADOW — is the single header shadow.
          headerShadowVisible: true,
          unmountOnBlur: false,
          lazy: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarBadgeStyle: {
            backgroundColor: ColorPalette.notification.errorIcon,
          },
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          header: createTabHeaderWithoutBanner,
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
            tabBarIcon: createTabBarIcon('Home', 'home-outline'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.Home.Title'),
            tabBarTestID: testIdWithKey('Home'),
            tabBarBadge: homeNotificationsBadgeCount,
            headerLeft: createMainSettingsHeaderButton(),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Services}
          component={Services}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon('Services', 'list-alt'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Services',
            tabBarTestID: testIdWithKey('Services'),
            headerLeft: createMainSettingsHeaderButton(),
            title: t('BCSC.Services.Title'),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Wallet}
          component={ScopedCredentialStack}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon('Wallet', 'wallet'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Wallet',
            tabBarTestID: testIdWithKey('Wallet'),
            headerShown: false,
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
