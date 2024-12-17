import { CredentialExchangeRecord as CredentialRecord } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import {
  AttachTourStep,
  BifoldError,
  CredentialStack,
  DispatchAction,
  EventTypes,
  HomeStack,
  TOKENS,
  connectFromScanOrDeepLink,
  testIdWithKey,
  useServices,
  useStore,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import {
  CustomRecord,
  HistoryCardType,
  HistoryRecord,
  RecordType,
} from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { TourID } from '@hyperledger/aries-bifold-core/App/types/tour'
import { parseCredDefFromId } from '@hyperledger/aries-bifold-core/App/utils/cred-def'
import { getCredentialIdentifiers } from '@hyperledger/aries-bifold-core/App/utils/credential'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { ReducerAction, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useWindowDimensions, View, StyleSheet, ViewStyle, AppState, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SvgProps } from 'react-native-svg'

import AtestationTabIcon from '../assets/img/icons/atestation.svg'
import HomeTabIcon from '../assets/img/icons/home.svg'
import NotificationTabIcon from '../assets/img/icons/notification.svg'
import PlusTabIcon from '../assets/img/icons/plus.svg'
import { NotificationReturnType, NotificationsInputProps, NotificationType } from '../hooks/notifications'
import { BCDispatchAction, BCState, ActivityState } from '../store'
import { notificationsSeenOnHome } from '../utils/notificationsSeenOnHome'

import ActivitiesStack from './ActivitiesStack'
import PlusStack from './PlusStack'
import { TabStackParams, TabStacks } from './navigators'

const TabStack: React.FC = () => {
  const { fontScale } = useWindowDimensions()
  const { agent } = useAgent()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<TabStackParams>>()

  const [
    { useNotifications },
    { enableImplicitInvitations, enableReuseConnections },
    logger,
    historyManagerCurried,
    historyEnabled,
  ] = useServices([
    TOKENS.NOTIFICATIONS,
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
    TOKENS.FN_LOAD_HISTORY,
    TOKENS.HISTORY_ENABLED,
  ])

  const notifications = useNotifications({ isHome: false } as NotificationsInputProps)
  const { t } = useTranslation()
  const Tab = createBottomTabNavigator<TabStackParams>()
  const { ColorPallet, TabTheme, TextTheme } = useTheme()
  const showLabels = fontScale * TabTheme.tabBarTextStyle.fontSize < 18
  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  const logHistoryRecord = useCallback(
    async (credential: CredentialRecord) => {
      const connection = await agent?.connections.findById(credential?.connectionId ?? '')
      const correspondenceName = connection?.alias || connection?.theirLabel || credential.connectionId
      try {
        if (!(agent && historyEnabled)) {
          logger.trace(
            `[${TabStack.name}]:[logHistoryRecord] Skipping history log, either history function disabled or agent undefined!`
          )
          return
        }
        const historyManager = historyManagerCurried(agent)

        const type = HistoryCardType.CardRevoked

        const events = await historyManager.getHistoryItems({ type: RecordType.HistoryRecord })
        if (
          events.some(
            (event: CustomRecord) => event.content.type === type && event.content.correspondenceId === credential.id
          )
        ) {
          return
        }
        const ids = getCredentialIdentifiers(credential)
        const name = parseCredDefFromId(ids.credentialDefinitionId, ids.schemaId)

        /** Save history record for card accepted */
        const recordData: HistoryRecord = {
          type: type,
          message: name,
          createdAt: new Date(),
          correspondenceId: credential.id,
          correspondenceName: correspondenceName,
        }
        await historyManager.saveHistory(recordData)
      } catch (err: unknown) {
        logger.error(`[${TabStack.name}]:[logHistoryRecord] Error saving history: ${err}`)
      }
    },
    [agent, historyEnabled, logger, historyManagerCurried]
  )

  const handleDeepLink = useCallback(
    async (deepLink: string) => {
      logger.info(`Handling deeplink: ${deepLink}`)

      // If it's just the general link with no params, set link inactive and do nothing
      if (deepLink.search(/oob=|c_i=|d_m=|url=/) < 0) {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
        return
      }

      try {
        await connectFromScanOrDeepLink(
          deepLink,
          agent,
          logger,
          navigation,
          true, // isDeepLink
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1039'),
          t('Error.Message1039'),
          (err as Error)?.message ?? err,
          1039
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      } finally {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
      }
    },
    [agent, enableImplicitInvitations, enableReuseConnections, logger, navigation, t, dispatch]
  )

  useEffect(() => {
    if (store.deepLink && agent && store.authentication.didAuthenticate) {
      handleDeepLink(store.deepLink)
    }
  }, [store.deepLink, agent, store.authentication.didAuthenticate, handleDeepLink])

  const tabBarIconContainerStyles = (focused: boolean): ViewStyle => ({
    ...TabTheme.tabBarContainerStyle,
    borderTopWidth: 2,
    borderTopColor: focused ? ColorPallet.brand.primary : 'transparent',
    width: '100%',
    justifyContent: 'center',
  })

  const tabs = [
    { name: TabStacks.HomeStack, component: HomeStack, label: t('TabStack.Home'), icon: HomeTabIcon },
    {
      name: TabStacks.ActivitiesStack,
      component: ActivitiesStack,
      label: t('TabStack.Activities'),
      icon: NotificationTabIcon,
    },
    {
      name: TabStacks.CredentialStack,
      component: CredentialStack,
      label: t('TabStack.Credentials'),
      icon: AtestationTabIcon,
    },
    { name: TabStacks.OptionsPlusStack, component: PlusStack, label: t('TabStack.OptionsPlus'), icon: PlusTabIcon },
  ]

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background' && agent) {
        await notificationsSeenOnHome(
          agent,
          notifications as NotificationReturnType,
          // eslint-disable-next-line
          dispatch as React.Dispatch<ReducerAction<any>>
        )
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [agent, notifications])

  useEffect(() => {
    const notificationsToAdd = {} as ActivityState
    for (const n of notifications) {
      if (!store.activities[(n as NotificationType).id]) {
        notificationsToAdd[(n as NotificationType).id] = {
          isRead: false,
          isTempDeleted: false,
        }
      }
      if (
        (n as CredentialRecord).type === 'CredentialRecord' &&
        (n as CredentialRecord).state === 'done' &&
        (n as CredentialRecord).revocationNotification
      ) {
        logHistoryRecord(n as CredentialRecord)
      }
    }
    if (Object.keys(notificationsToAdd).length > 0) {
      dispatch({
        type: BCDispatchAction.NOTIFICATIONS_UPDATED,
        payload: [notificationsToAdd],
      })
    }
  }, [notifications])

  const TabBarIcon = (props: {
    focused: boolean
    color: string
    size: number
    label: string
    hasBadge: boolean
    Icon: React.FC<SvgProps>
  }) => {
    return (
      <AttachTourStep tourID={TourID.HomeTour} index={1}>
        <View style={tabBarIconContainerStyles(props.focused)}>
          <props.Icon
            color={props.focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor}
            height={24}
          />
          {showLabels && (
            <Text
              style={{
                ...TabTheme.tabBarTextStyle,
                color: props.focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
                fontWeight: props.focused ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
              }}
            >
              {props.label}
            </Text>
          )}
          {props.hasBadge && notifications.length > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 2,
                left: '55%',
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: ColorPallet.brand.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: ColorPallet.brand.text,
                  fontSize: 9,
                  fontWeight: 'bold',
                }}
              >
                {notifications.length}
              </Text>
            </View>
          )}
        </View>
      </AttachTourStep>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: ColorPallet.brand.primary }}>
      <Tab.Navigator
        initialRouteName={TabStacks.HomeStack}
        screenOptions={{
          unmountOnBlur: true,
          tabBarStyle: {
            ...TabTheme.tabBarStyle,
          },
          tabBarActiveTintColor: TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: TabTheme.tabBarInactiveTintColor,
          header: () => null,
        }}
      >
        {tabs.map((item, index) => (
          <Tab.Screen
            key={index}
            name={item.name}
            component={item.component}
            options={{
              tabBarIconStyle: styles.tabBarIcon,
              tabBarIcon: (props) => (
                <TabBarIcon
                  {...props}
                  label={item.label}
                  Icon={item.icon}
                  hasBadge={item.name == TabStacks.ActivitiesStack}
                />
              ),
              tabBarShowLabel: false,
              tabBarAccessibilityLabel: index != 1 ? item.label : `${item.label} (${notifications.length ?? 0})`,
              tabBarTestID: testIdWithKey(item.label),
            }}
          />
        ))}
      </Tab.Navigator>
    </SafeAreaView>
  )
}

export default TabStack
