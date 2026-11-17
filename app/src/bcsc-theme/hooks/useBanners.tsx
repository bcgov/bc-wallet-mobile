import { BCState } from '@/store'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCBanner, BCSCBannerMessage } from '../components/AppBanner'
import { useServerStatus } from '../contexts/ServerStatusContext'
import { BannerDismissal } from '../state/banners/banner-dismissal'
import { selectBannerDismissal } from '../state/banners/selectors'
import { useBannersWriter } from '../state/banners/useBannersWriter'
import { DeviceLimit } from '../state/devices/device-limit'
import { useDeviceLimit } from '../state/devices/useDeviceLimit'
import { AppUpdate } from '../state/update/app-update'
import { useAppUpdate } from '../state/update/useAppUpdate'
import { BCSCAuthStackParams, BCSCMainStackParams, BCSCScreens } from '../types/navigators'

/** The container renders on Home (MainStack) and account landing (AuthStack); both register this route. */
type ServiceNoticeParamList = Pick<BCSCMainStackParams & BCSCAuthStackParams, BCSCScreens.ServiceNotice>

export enum BannersScope {
  Home = 'home',
  Auth = 'auth',
}

const BANNERS_BY_SCOPE: Record<BannersScope, Set<BCSCBanner>> = {
  [BannersScope.Home]: new Set([BCSCBanner.APP_UPDATE_AVAILABLE, BCSCBanner.DEVICE_LIMIT_EXCEEDED]),
  [BannersScope.Auth]: new Set([BCSCBanner.APP_UPDATE_AVAILABLE]),
}

type BannersOptions =
  | {
      scope: BannersScope.Home
      onDeviceLimitPress: () => void
    }
  | {
      scope: BannersScope.Auth
      onDeviceLimitPress?: never
    }

/**
 * Returns the list of banners to be displayed in the app, including both shared banners and banners from the store.
 *
 * @returns An object containing the list of banners and metadata.
 */
export const useBanners = (options: BannersOptions) => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<ServiceNoticeParamList>>()
  const [store] = useStore<BCState>()
  const appUpdate = useAppUpdate()
  const deviceLimit = useDeviceLimit()
  const server = useServerStatus()
  const { recordBannerDismissal } = useBannersWriter()

  const appBanners = useMemo(() => {
    const banners: BCSCBannerMessage[] = []

    if (server.isAvailable === false) {
      banners.push({
        id: BCSCBanner.IAS_SERVER_UNAVAILABLE,
        title: undefined,
        description: server.statusMessage ?? t('BCSC.SystemChecks.ServerStatus.UnavailableBannerTitle'),
        type: 'info',
        dismissible: false,
        onPress: () => {
          if (server.contactLink) {
            void openLink(server.contactLink)
          }
          void server.refresh()
          // Note: This banner is non-dismissible (wait for server to come back online)
        },
      })
    }

    if (server.isAvailable && server.statusMessage) {
      banners.push({
        id: BCSCBanner.IAS_SERVER_NOTIFICATION,
        title: t('BCSC.SystemChecks.ServerStatus.NoticeBannerTitle'),
        type: 'warning',
        dismissible: false,
        onPress: () => {
          navigation.navigate(BCSCScreens.ServiceNotice)
          // Note: This banner is non-dismissible
        },
      })
    }

    if (appUpdate === AppUpdate.Optional) {
      banners.push({
        id: BCSCBanner.APP_UPDATE_AVAILABLE,
        title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
        type: 'info',
        dismissible: true,
        onPress: () => {
          recordBannerDismissal(BCSCBanner.APP_UPDATE_AVAILABLE)
          void openLink(getBCSCAppStoreUrl())
        },
      })
    }

    if (deviceLimit.limit === DeviceLimit.AtOrOver) {
      banners.push({
        id: BCSCBanner.DEVICE_LIMIT_EXCEEDED,
        title: t('BCSC.SystemChecks.Devices.DeviceLimitReachedBannerTitle'),
        type: 'warning',
        dismissible: false, // Non-dismissible banner (user must dismiss from screen)
        onPress: options.onDeviceLimitPress,
      })
    }

    const allowedBanners = BANNERS_BY_SCOPE[options.scope]
    const now = Date.now() // stable timestamp for the current render

    return (
      banners
        // 1. Filter out banners that have been dismissed
        .filter((banner) => selectBannerDismissal(store, banner.id, now) !== BannerDismissal.Dismissed)
        // 2. Filter out banners that are not allowed in the current scope
        .filter((banner) => allowedBanners.has(banner.id))
    )
  }, [
    server,
    appUpdate,
    deviceLimit.limit,
    options.scope,
    options.onDeviceLimitPress,
    t,
    navigation,
    recordBannerDismissal,
    store,
  ])

  return useMemo(
    () => ({
      banners: appBanners,
      metadata: {
        deviceLimit,
      },
    }),
    [appBanners, deviceLimit]
  )
}
