import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React, { useCallback } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { testIdWithKey, TOKENS, useServices, useTheme } from '@bifold/core'
import Account from '../features/account/Account'
import Home from '../features/home/Home'
import Services from '../features/services/Services'
import Settings from '../features/settings/Settings'
import { BCSCRootStackParams, BCSCScreens, BCSCTabStackParams } from '../types/navigators'
import createHelpHeaderButton from '../components/HelpHeaderButton'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { HelpCentreUrl } from '@/constants'
import { useTranslation } from 'react-i18next'

type TabBarIconProps = {
  focused: boolean
  color: string
  size: number
}

const createTabBarIcon = (label: string, iconName: string): React.FC<TabBarIconProps> => {
  const TabBarIconComponent: React.FC<TabBarIconProps> = ({ focused }) => {
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
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<StackNavigationProp<BCSCRootStackParams, BCSCScreens.WebView>>()

  // this style should be moved to the theme file here and in Bifold
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  /**
   * Handles navigation to the Help Centre webview.
   *
   * @param {string} helpCentreUrl - The URL of the Help Centre page to navigate to.
   * @returns {*} {Promise<void>}
   */
  const handleHelpCentreNavigation = useCallback(
    async (helpCentreUrl: HelpCentreUrl) => {
      try {
        navigation.navigate(BCSCScreens.WebView, {
          url: helpCentreUrl,
          title: t('HelpCentre.Title'),
        })
      } catch (error) {
        logger.error(`Error navigating to Help Center webview: ${error}`)
      }
    },
    [navigation, logger, t]
  )

  return (
    <>
      <Tab.Navigator
        initialRouteName={BCSCScreens.Home}
        screenOptions={{
          unmountOnBlur: false,
          lazy: false,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          headerShown: false,
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
            title: '',
            headerShown: true,
            headerLeft: () => null,
            headerRight: createHelpHeaderButton({ helpAction: () => handleHelpCentreNavigation(HelpCentreUrl.HOME) }),
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
          }}
        />
        <Tab.Screen
          name={BCSCScreens.Account}
          component={Account}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon('Account', 'account'),
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
            tabBarIcon: createTabBarIcon('Settings', 'cog'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: 'Settings',
            tabBarTestID: testIdWithKey('Settings'),
          }}
        />
      </Tab.Navigator>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
    </>
  )
}

export default BCSCTabStack
