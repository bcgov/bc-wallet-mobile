import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCState } from '@/store'
import { BannerMessage, DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect } from 'react'

/**
 * NotificationBannerContainer fetches the server status and displays a notification banner.
 *
 * @returns {JSX.Element} The rendered NotificationBanner component.
 */
export const NotificationBannerContainer: React.FC = () => {
  const [, dispatch] = useStore<BCState>()
  const { config } = useApi()
  const [NotificationBanner, logger] = useServices([TOKENS.COMPONENT_NOTIFICATION_BANNER, TOKENS.UTIL_LOGGER])

  // Fetch server status and update the banner messages
  useEffect(() => {
    const asyncEffect = async () => {
      try {
        const serverStatus = await config.getServerStatus()

        // If the server status is OK, do nothing
        if (serverStatus.status === 'ok') {
          return
        }

        // If the server status is not OK, show a warning banner
        dispatch({
          type: DispatchAction.BANNER_MESSAGES,
          payload: [
            {
              id: 'IASServerUnavailable',
              title: serverStatus.statusMessage ?? 'IAS server is unavailable',
              type: 'warning',
              variant: 'summary',
              dismissible: true,
            } satisfies BannerMessage,
          ],
        })
      } catch (error: any) {
        // If there's an error fetching the server status, show an error banner
        dispatch({
          type: DispatchAction.BANNER_MESSAGES,
          payload: [
            {
              id: 'IASServerError',
              title: 'Unable to retrieve server status',
              type: 'error',
              variant: 'summary',
              dismissible: true,
            } satisfies BannerMessage,
          ],
        })

        logger.error('Error while fetching server status', error)
      }
    }

    asyncEffect()
  }, [config, dispatch, logger])
  return <NotificationBanner />
}
