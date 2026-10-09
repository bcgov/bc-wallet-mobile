import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { CONTACT_US_HELP_URL } from '@/constants'
import { openLink } from '@/utils/links'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** A block of fixed guidance under the IAS message: a heading, a description and optional bullets. */
export interface ServiceNoticeSection {
  heading: string
  description: string
  bullets?: string[]
}

/**
 * Backs the screen the service notice banner opens: the full IAS status message the banner only summarizes,
 * then fixed guidance from the design on what may take longer. Reads the live server status, which has no
 * message once IAS withdraws the notice or when the status fetch fails while a banner persisted from an
 * earlier launch is still up. The guidance is left out then, as there is no notice for it to explain.
 */
const useServiceNoticeViewModel = () => {
  const { t } = useTranslation()
  const { statusMessage, contactLink } = useServerStatus()

  const sections = useMemo<ServiceNoticeSection[]>(
    () =>
      statusMessage
        ? [
            {
              heading: t('BCSC.ServiceNotice.MobileCardHeading'),
              description: t('BCSC.ServiceNotice.MobileCardDescription'),
              bullets: [t('BCSC.ServiceNotice.MobileCardVideoCall'), t('BCSC.ServiceNotice.MobileCardSendVideo')],
            },
            {
              heading: t('BCSC.ServiceNotice.LoginHeading'),
              description: t('BCSC.ServiceNotice.LoginDescription'),
            },
          ]
        : [],
    [statusMessage, t]
  )

  const handleContactUs = useCallback(() => {
    void openLink(contactLink ?? CONTACT_US_HELP_URL)
  }, [contactLink])

  return {
    headerText: t('BCSC.ServiceNotice.Header'),
    messageText: statusMessage ?? t('BCSC.ServiceNotice.NoticeUnavailable'),
    sections,
    haveQuestionsText: t('BCSC.ServiceNotice.HaveQuestions'),
    contactUsLinkText: t('BCSC.ServiceNotice.ContactUsLink'),
    contactUsLinkHint: t('Global.A11y.OpensInBrowser'),
    handleContactUs,
  }
}

export default useServiceNoticeViewModel
