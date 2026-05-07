import { useCustomNotifications } from '@/hooks/useCustomNotifications'
import { CredentialStack, testIdWithKey, useTheme } from '@bifold/core'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { createMainFloatingMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createMainSettingsHeaderButton } from '../components/SettingsHeaderButton'
import { AgentReadyGate } from '../features/agent'
import { FloatingScanButton } from '../features/scan'
import Home from '../features/home/Home'
import Services from '../features/services/Services'
import { BCSCMainStackParams, BCSCScreens, BCSCTabStackParams } from '../types/navigators'

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

const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 })

const BCSCTabStack: React.FC = () => {
  const Tab = createBottomTabNavigator<BCSCTabStackParams>()
  const { TabTheme, ColorPalette, Spacing } = useTheme()
  const { customNotifications } = useCustomNotifications()
  const [activeTab, setActiveTab] = useState<string>(BCSCScreens.Home)
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { bottom: safeAreaBottom } = useSafeAreaInsets()

  // FIXME (V4.1.x): Add custom notifications and credential notifications together to calculate badge count.
  // Need to wait until useNotifications doesn't throw an error when un-wrapped by the providers.
  // If that's not possible, call navigation.setOptions({ tabBarBadge: badgeCount }) to update the badge count when notifications change.
  const homeNotificationsBadgeCount = customNotifications.length || undefined

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
          focus: () => setActiveTab(route.name),
        })}
        initialRouteName={BCSCScreens.Home}
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
      <View style={styles.fabContainer} pointerEvents="box-none">
        <FloatingScanButton activeTabName={activeTab} onPress={handleScanPress} />
      </View>
    </View>
  )
}

export default BCSCTabStack
