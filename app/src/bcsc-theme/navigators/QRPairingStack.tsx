import ManualPairing from '@/bcsc-theme/features/pairing/ManualPairing'
import QRDisplay from '@/bcsc-theme/features/qr-scanning/QRDisplay'
import QRScanner from '@/bcsc-theme/features/qr-scanning/QRScanner'
import { testIdWithKey, useTheme } from '@bifold/core'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type QRPairingTabParams = {
  Scanner: undefined
  Display: undefined
  PairingCode: undefined
}

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

const QRPairingStack: React.FC = () => {
  const Tab = createBottomTabNavigator<QRPairingTabParams>()
  const { TabTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          unmountOnBlur: false,
          lazy: true,
          tabBarStyle: TabTheme.tabBarStyle,
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          title: '',
        }}
      >
        <Tab.Screen
          name="Scanner"
          component={QRScanner}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('Scan.ScanQRCode'), 'qrcode-scan'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('Scan.ScanQRCode'),
            tabBarTestID: testIdWithKey('ScanQRCode'),
          }}
        />
        <Tab.Screen
          name="Display"
          component={QRDisplay}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('Scan.MyQRCode'), 'qrcode'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('Scan.MyQRCode'),
            tabBarTestID: testIdWithKey('MyQRCode'),
          }}
        />
        <Tab.Screen
          name="PairingCode"
          component={ManualPairing}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('BCSC.ManualPairing.TabTitle'), 'keyboard-outline'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.ManualPairing.TabTitle'),
            tabBarTestID: testIdWithKey('PairingCode'),
          }}
        />
      </Tab.Navigator>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
    </>
  )
}

export default QRPairingStack
