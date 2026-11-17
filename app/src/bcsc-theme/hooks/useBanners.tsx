import { BCState } from '@/store'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCBanner, BCSCBannerMessage } from '../components/AppBanner'
import { BannerDismissal } from '../state/banners/banner-dismissal'
import { selectBannerDismissal } from '../state/banners/selectors'
import { useBannersWriter } from '../state/banners/useBannersWriter'
import { DeviceLimit } from '../state/devices/device-limit'
import { useDeviceLimit } from '../state/devices/useDeviceLimit'
import { AppUpdate } from '../state/update/app-update'
import { useAppUpdate } from '../state/update/useAppUpdate'

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
  const [store] = useStore<BCState>()
  const appUpdate = useAppUpdate()
  const deviceLimit = useDeviceLimit()
  const { recordBannerDismissal } = useBannersWriter()

  const appBanners = useMemo(() => {
    const banners: BCSCBannerMessage[] = []

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

    return (
      banners
        // 1. Filter out banners that have been dismissed
        .filter((banner) => selectBannerDismissal(store, banner.id) !== BannerDismissal.Dismissed)
        // 2. Filter out banners that are not allowed in the current scope
        .filter((banner) => allowedBanners.has(banner.id))
    )
  }, [appUpdate, deviceLimit.limit, options.scope, options.onDeviceLimitPress, t, recordBannerDismissal, store])

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
