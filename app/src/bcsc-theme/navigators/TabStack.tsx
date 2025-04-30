import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { testIdWithKey, useTheme } from '@bifold/core'
import Account from '../features/account/Account'
import Home from '../features/home/Home'
import Services from '../features/services/Services'
import Settings from '../features/settings/Settings'
import { BCSCScreens, BCSCTabStackParams } from '../types/navigators'

const BCSCTabStack: React.FC = () => {
  const { fontScale } = useWindowDimensions()
  const Tab = createBottomTabNavigator<BCSCTabStackParams>()
  const { TabTheme, TextTheme, Spacing } = useTheme()
  const showLabels = fontScale * TabTheme.tabBarTextStyle.fontSize < 18
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: TabTheme.tabBarStyle.backgroundColor }}>
      <Tab.Navigator
        initialRouteName={BCSCScreens.Home}
        screenOptions={{
          unmountOnBlur: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          header: () => null,
        }}
      >
        <Tab.Screen
          name={BCSCScreens.Home}
          component={Home}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ focused }) => (
              <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                <Icon
                  name={'home'}
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
                    {'Home'}
                  </Text>
                )}
              </View>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Home',
            tabBarTestID: testIdWithKey('Home'),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Services}
          component={Services}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ focused }) => (
              <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                <Icon
                  name={'view-list-outline'}
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
                    {'Services'}
                  </Text>
                )}
              </View>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Services',
            tabBarTestID: testIdWithKey('Services'),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Account}
          component={Account}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ focused }) => (
              <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                <Icon
                  name={'account'}
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
                    {'Account'}
                  </Text>
                )}
              </View>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Account',
            tabBarTestID: testIdWithKey('Account'),
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Settings}
          component={Settings}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ focused }) => (
              <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                <Icon
                  name={'cog'}
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
                    {'Settings'}
                  </Text>
                )}
              </View>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Settings',
            tabBarTestID: testIdWithKey('Settings'),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  )
}

export default BCSCTabStack
