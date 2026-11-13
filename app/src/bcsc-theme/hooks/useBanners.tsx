import { BCDispatchAction, BCState } from '@/store'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCBanner, BCSCBannerMessage } from '../components/AppBanner'
import { AppUpdate } from '../state/app-update/app-update'
import { useAppUpdate } from '../state/app-update/useAppUpdate'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the list of banners to be displayed in the app, including both shared banners and banners from the store.
 *
 * @returns An array of BCSCBannerMessage objects representing the banners to be displayed.
 */
export const useBanners = (): BCSCBannerMessage[] => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const appUpdate = useAppUpdate()

  // NOTE: temp while migrating the banners to this new system
  const filteredStoreBanners = useMemo(
    () => store.bcsc.bannerMessages.filter((banner) => banner.id !== BCSCBanner.APP_UPDATE_AVAILABLE),
    [store.bcsc.bannerMessages]
  )

  const dismissBanner = useCallback(
    (bannerId: BCSCBanner, dismissedFor: number) => {
      dispatch({
        type: BCDispatchAction.DISMISS_BANNER,
        payload: [{ id: bannerId, dismissedFor }],
      })
    },
    [dispatch]
  )

  const appBanners = useMemo(() => {
    const banners: BCSCBannerMessage[] = []

    if (appUpdate === AppUpdate.Optional) {
      banners.push({
        id: BCSCBanner.APP_UPDATE_AVAILABLE,
        title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
        type: 'info',
        dismissible: true,
        onPress: () => {
          dismissBanner(BCSCBanner.APP_UPDATE_AVAILABLE, ONE_DAY_MS)
          void openLink(getBCSCAppStoreUrl())
        },
      })
    }

    return banners
  }, [appUpdate, dismissBanner, t])

  return useMemo(() => [...appBanners, ...filteredStoreBanners], [filteredStoreBanners, appBanners])
}
