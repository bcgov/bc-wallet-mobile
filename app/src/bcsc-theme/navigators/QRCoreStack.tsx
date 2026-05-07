import { VerifyPromptScreen } from '@/bcsc-theme/features/onboarding/VerifyPromptScreen'
import ManualPairing from '@/bcsc-theme/features/pairing/ManualPairing'
import QRDisplay from '@/bcsc-theme/features/qr-core/QRDisplay'
import QRScanner from '@/bcsc-theme/features/qr-core/QRScanner'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey, useTheme } from '@bifold/core'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { createAuthHelpHeaderButton } from '../components/HelpHeaderButton'

type QRCoreTabParams = {
  Scanner: undefined
  Display: undefined
  PairingCode: undefined
  AccountNotVerified: undefined
}

type TabBarIconProps = {
  focused: boolean
  color: string
  size: number
}

const PairingCodeScreen: React.FC = () => {
  const { needsVerification } = useVerificationStatus()
  return needsVerification ? <VerifyPromptScreen showSkip={false} /> : <ManualPairing />
}

const createQRBackButton = () => {
  const QRBackButton = () => {
    const navigation = useNavigation()
    return (
      <IconButton
        buttonLocation={ButtonLocation.Left}
        icon={Platform.select({ ios: 'arrow-back-ios', android: 'arrow-left', default: 'arrow-left' })}
        accessibilityLabel="Back"
        testID={testIdWithKey('Back')}
        onPress={() => navigation.getParent()?.goBack()}
      />
    )
  }
  return QRBackButton
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
          size={focused ? Spacing.lg + 2 : Spacing.lg}
          color={focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor}
        />
        {showLabels && (
          <Text
            style={{
              ...TabTheme.tabBarTextStyle,
              color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
              fontFamily: focused ? TextTheme.bold.fontFamily : TextTheme.normal.fontFamily,
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

const QRCoreStack: React.FC = () => {
  const Tab = createBottomTabNavigator<QRCoreTabParams>()
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
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerLeft: createQRBackButton(),
        }}
      >
        <Tab.Screen
          name="Scanner"
          component={QRScanner}
          options={{
            title: t('Scan.ScanQRCode'),
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('Scan.ScanQRCode'), 'qrcode-scan'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('Scan.ScanQRCode'),
            tabBarTestID: testIdWithKey('ScanQRCode'),
            headerRight: createAuthHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.COMPUTER_LOGIN }),
          }}
        />
        <Tab.Screen
          name="Display"
          component={QRDisplay}
          options={{
            title: t('Scan.MyQRCode'),
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('Scan.MyQRCode'), 'qrcode'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('Scan.MyQRCode'),
            tabBarTestID: testIdWithKey('MyQRCode'),
          }}
        />
        <Tab.Screen
          name="PairingCode"
          component={PairingCodeScreen}
          options={{
            title: t('BCSC.ManualPairing.TabTitle'),
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: createTabBarIcon(t('BCSC.ManualPairing.TabTitle'), 'import'),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('BCSC.ManualPairing.TabTitle'),
            tabBarTestID: testIdWithKey('PairingCode'),
            headerRight: createAuthHelpHeaderButton({ helpCentreUrl: HelpCentreUrl.COMPUTER_LOGIN }),
          }}
        />
      </Tab.Navigator>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} />
    </>
  )
}

export default QRCoreStack
