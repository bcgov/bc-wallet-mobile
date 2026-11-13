import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCBanner, BCSCBannerMessage } from '../components/AppBanner'
import { AppUpdate } from '../state/banners/app-update'
import { useAppUpdate } from '../state/banners/useAppUpdate'

interface BannersOptions {
  exclude?: BCSCBanner[]
}

/**
 * Returns an array of banner messages to be displayed in the app.
 *
 * @param exclude - An array of BCSCBanner enums to exclude from the returned banners.
 * @returns An array of BCSCBannerMessage objects representing the banners to be displayed.
 */
export const useBanners = (options: BannersOptions): BCSCBannerMessage[] => {
  const { t } = useTranslation()
  const appUpdate = useAppUpdate()

  return useMemo(() => {
    const banners: BCSCBannerMessage[] = []
    const excludeSet = new Set(options.exclude ?? [])

    if (appUpdate === AppUpdate.Optional) {
      banners.push({
        id: BCSCBanner.APP_UPDATE_AVAILABLE,
        title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
        type: 'info',
        dismissible: true,
      })
    }

    return banners.filter((banner) => !excludeSet.has(banner.id))
  }, [appUpdate, options.exclude, t])
}
