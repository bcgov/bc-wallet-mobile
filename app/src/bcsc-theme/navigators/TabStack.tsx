import { HelpCentreUrl } from '@/constants'
import { CredentialStack, testIdWithKey, useTheme } from '@bifold/core'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React, { useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { createMainHelpHeaderButton } from '../components/HelpHeaderButton'
import { createMainSettingsHeaderButton } from '../components/SettingsHeaderButton'
import Home from '../features/home/Home'
import { FloatingScanButton } from '../features/scan'
import Services from '../features/services/Services'
import { BCSCScreens, BCSCTabStackParams } from '../types/navigators'

const TAB_BAR_HEIGHT_ESTIMATE = 64
const FAB_EDGE_MARGIN = 16

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

const BCSCTabStack: React.FC = () => {
  const Tab = createBottomTabNavigator<BCSCTabStackParams>()
  const { TabTheme } = useTheme()
  const insets = useSafeAreaInsets()
  const [activeTabName, setActiveTabName] = useState<string>(BCSCScreens.Home)

  // this style should be moved to the theme file here and in Bifold
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
    fabContainer: {
      position: 'absolute',
      right: FAB_EDGE_MARGIN,
      bottom: TAB_BAR_HEIGHT_ESTIMATE + insets.bottom + FAB_EDGE_MARGIN,
    },
  })

  return (
    <>
      <Tab.Navigator
        initialRouteName={BCSCScreens.Home}
        screenOptions={{
          unmountOnBlur: false,
          lazy: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          title: '',
        }}
        screenListeners={{
          state: (event) => {
            const data = event.data as { state?: { index: number; routes: { name: string }[] } }
            const state = data.state
            if (!state) {
              return
            }
            const focused = state.routes[state.index]?.name
            if (focused) {
              setActiveTabName(focused)
            }
          },
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
            headerLeft: createMainSettingsHeaderButton(),
            headerRight: createMainHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.HOME }),
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
          component={CredentialStack}
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
      <View pointerEvents="box-none" style={styles.fabContainer}>
        <FloatingScanButton activeTabName={activeTabName} />
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
    </>
  )
}

export default BCSCTabStack
