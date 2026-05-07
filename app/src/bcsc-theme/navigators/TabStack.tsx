import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { CredentialStack, testIdWithKey, useTheme } from '@bifold/core'
import { BottomTabBar, BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { createMainFloatingMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createTabHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { createMainSettingsHeaderButton } from '../components/SettingsHeaderButton'
import { AgentReadyGate } from '../features/agent'
import Home from '../features/home/Home'
import Services from '../features/services/Services'
import { BCSCScreens, BCSCTabStackParams } from '../types/navigators'

const ScopedCredentialStack: React.FC = () => (
  <AgentReadyGate testID={testIdWithKey('Wallet.Loading')}>
    <CredentialStack />
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
              fontWeight: focused ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
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

const ACTIVE_INDICATOR_HEIGHT = 3
const ACTIVE_INDICATOR_DURATION_MS = 100

const AnimatedTabBar: React.FC<BottomTabBarProps> = (props) => {
  const { ColorPalette } = useTheme()
  const { state } = props
  const tabCount = state.routes.length
  const { width: windowWidth } = useWindowDimensions()
  const tabWidth = windowWidth / tabCount
  const indicatorWidth = tabWidth * 0.8
  const indicatorOffset = (tabWidth - indicatorWidth) / 2
  const translateX = useRef(new Animated.Value(state.index * tabWidth + indicatorOffset)).current

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

const BCSCTabStack: React.FC = () => {
  const Tab = createBottomTabNavigator<BCSCTabStackParams>()
  const { TabTheme, ColorPalette } = useTheme()
  const { customNotifications } = useCustomNotifications()
  const { t } = useTranslation()

  // FIXME (V4.1.x): Add custom notifications and credential notifications together to calculate badge count.
  // Need to wait until useNotifications doesn't throw an error when un-wrapped by the providers.
  // If that's not possible, call navigation.setOptions({ tabBarBadge: badgeCount }) to update the badge count when notifications change.
  const homeNotificationsBadgeCount = customNotifications.length || undefined

  // this style should be moved to the theme file here and in Bifold
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  return (
    <>
      <Tab.Navigator
        initialRouteName={BCSCScreens.Home}
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          unmountOnBlur: false,
          lazy: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarBadgeStyle: {
            backgroundColor: ColorPalette.notification.errorIcon,
          },
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          title: '',
          header: createTabHeaderWithoutBanner,
          headerRight: createMainFloatingMenuButton(),
        }}
      >
        <Tab.Screen
          name={BCSCScreens.Home}
          component={Home}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon('Home', 'home'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Home',
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
            tabBarIcon: createTabBarIcon('Services', 'view-list-outline'),
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
            tabBarIcon: createTabBarIcon('Wallet', 'wallet-outline'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Wallet',
            tabBarTestID: testIdWithKey('Wallet'),
            headerShown: false,
          }}
        />
      </Tab.Navigator>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
    </>
  )
}

export default BCSCTabStack
