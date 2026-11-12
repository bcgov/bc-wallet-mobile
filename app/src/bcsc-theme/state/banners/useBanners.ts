import { BCSCBanner, BCSCBannerMessage } from '@/bcsc-theme/components/AppBanner'
import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { getBCSCAppStoreUrl, openLink } from '@/utils/links'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { selectUpdateBannerVisible } from './selectors'

/**
 * TODO (MD): Remove this once every banner is derived by useBanners.
 * Banner ids derived by useBanners, which take precedence over the same ids in the store
 * */
export const MIGRATED_BANNER_IDS: BCSCBanner[] = [BCSCBanner.APP_UPDATE_AVAILABLE]

/**
 * Returns an array of banner messages to be displayed in the app.
 *
 * @returns An array of BCSCBannerMessage objects representing the banners to be displayed.
 */
export const useBanners = (): BCSCBannerMessage[] => {
  const updateBanner = useUpdateBanner()

  return useMemo(() => {
    return [updateBanner].filter((banner) => banner !== null)
  }, [updateBanner])
}

/**
 * Returns the update banner message if the app update is available, otherwise returns null.
 *
 * @returns The update banner message or null if not applicable.
 */
export const useUpdateBanner = (): BCSCBannerMessage | null => {
  const { t } = useTranslation()
  const { serverStatus, isChecking } = useServerStatus()
  const [dismissed, setDismissed] = useState(false)

  return useMemo(() => {
    if (dismissed) {
      // note: purely ui state, not to be injected into the selector
      return null
    }

    const showUpdateBanner = selectUpdateBannerVisible(serverStatus, isChecking)

    if (!showUpdateBanner) {
      return null
    }

    return {
      id: BCSCBanner.APP_UPDATE_AVAILABLE,
      title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
      type: 'info',
      dismissible: true,
      onPress: () => {
        setDismissed(true)
        void openLink(getBCSCAppStoreUrl())
      },
    }
  }, [dismissed, isChecking, serverStatus, t])
}
