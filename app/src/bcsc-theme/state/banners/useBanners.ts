import { BCSCBanner, BCSCBannerMessage } from '@/bcsc-theme/components/AppBanner'
import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { selectUpdateBannerVisible } from './selectors'

/**
 * Returns an array of banner messages to be displayed in the app.
 *
 * @returns An array of BCSCBannerMessage objects representing the banners to be displayed.
 */
export const useBanners = (): BCSCBannerMessage[] => {
  const updateBanner = useUpdateBanner()

  return useMemo(() => {
    return [updateBanner].filter(Boolean) as BCSCBannerMessage[]
  }, [updateBanner])
}

/**
 * Returns the update banner message if the app update is available, otherwise returns null.
 *
 * @returns The update banner message or null if not applicable.
 */
export const useUpdateBanner = (): BCSCBannerMessage | null => {
  const { t } = useTranslation()
  const { serverStatus } = useServerStatus()

  return useMemo(() => {
    const showUpdateBanner = selectUpdateBannerVisible(serverStatus)

    if (!showUpdateBanner) {
      return null
    }

    return {
      id: BCSCBanner.APP_UPDATE_AVAILABLE,
      title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
      type: 'info',
      dismissible: true,
      onPress: () => {
        void openLink(getBCSCAppStoreUrl())
      },
    }
  }, [serverStatus, t])
}
