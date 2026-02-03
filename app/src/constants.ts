import { ViewStyle } from 'react-native'

export const autoDisableRemoteLoggingIntervalInMinutes = 60
export const surveyMonkeyUrl = 'https://www.surveymonkey.com/r/7BMHJL8'
export const surveyMonkeyExitUrl = 'https://www.surveymonkey.com/survey-thanks'
export const hitSlop = { top: 44, bottom: 44, left: 44, right: 44 }
interface AttestationRestrictionEnvironment {
  credDefIDs: readonly string[]
  invitationUrl: string
}

export const AttestationRestrictions: { [key: string]: AttestationRestrictionEnvironment } = {
  Development: {
    credDefIDs: ['NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet', 'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet_dev_v2'],
    invitationUrl:
      'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI0OGRkNzViNi0wMGI4LTQwZGItOTYxNy01MWIwNDZhZDI0MmEiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2VfREVWIiwgInJlY2lwaWVudEtleXMiOiBbIkVjZ0Q5VzRTVGVxa21zU1pOWUpBUEdRV2Y0d25IRFR5U01UUFJDdHpYRUVaIl0sICJzZXJ2aWNlRW5kcG9pbnQiOiAiaHR0cHM6Ly90cmFjdGlvbi1hY2FweS1kZXYuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwOi8vZXhhbXBsZS5jb20vIn0=',
  },
  Test: {
    credDefIDs: ['RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet', 'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet_test_v2'],
    invitationUrl:
      'https://traction-acapy-test.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICJkYzc1YTExMy1iZGM5LTRmNGEtYjM1YS04NTIyNzQ1ZjdkOTEiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiOVRmYm45c2drYlZvdGNQaWpSYm1oeEVuZnVteWNvVVl0ZHJ5dWpiN242cHEiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXRlc3QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
  Production: {
    credDefIDs: ['XqaRXJt4sXE6TRpfGpVbGw:3:CL:655:bcwallet'],
    invitationUrl:
      'https://traction-acapy-prod.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI0NjhkODE1ZC04OWY3LTQ4MGYtOGE1Yy1kNDllMjYyMjg4YTkiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiQ2pKbTkzVnRrcURSRTNROTVUeXpGN2lhNVRCdlJrVTU4MWNHZXZYU0FHaWoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXByb2QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
} as const

export const appleAppStoreUrl = 'https://apps.apple.com/ca/app/bc-wallet/id1587380443'
export const googlePlayStoreUrl = 'https://play.google.com/store/apps/details?id=ca.bc.gov.BCWallet&hl=en-CA'
export const appHelpUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/help'

export const BCThemeNames = {
  BCWallet: 'bcwallet',
  BCSC: 'bcsc',
} as const

// BCSC Constants
export const BCSC_EMAIL_NOT_PROVIDED = 'Not provided'
export const BCSC_APPLE_STORE_URL = 'https://apps.apple.com/us/app/id1234298467'
export const BCSC_GOOGLE_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ca.bc.gov.id.servicescard'
export const ACCOUNT_SERVICES_URL = 'https://id.gov.bc.ca/account/services'
export const TERMS_OF_USE_URL = 'https://id.gov.bc.ca/static/termsOfUse.html'
export const FEEDBACK_URL = 'https://id.gov.bc.ca/static/feedback.html'
export const ACCESSIBILITY_URL =
  'https://www2.gov.bc.ca/gov/content/governments/government-id/bcservicescardapp/accessibility'
// appending param fromapp=1 to certain id.gov urls automatically removes header and footer and such
export const HELP_URL = 'https://id.gov.bc.ca/static/help/topics.html?fromapp=1'
export const SECURE_APP_LEARN_MORE_URL = 'https://id.gov.bc.ca/static/help/secure_app.html'
export const CONTACT_US_GOVERNMENT_WEBSITE_URL =
  'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-services-card/contact-us'
export const GET_BCSC_CARD_URL =
  'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-services-card/your-card/get-a-card'
export const ANALYTICS_URL =
  'https://www2.gov.bc.ca/gov/content/governments/services-for-government/service-experience-digital-delivery/web-content-development-guides/analytics'
export const BC_SERVICE_LOCATION_URL = 'https://www2.gov.bc.ca/gov/content?id=FD6DB5BA2A5248038EEF54D9F9F37C4D'
export const REPORT_SUSPICIOUS_URL =
  'https://www2.gov.bc.ca/gov/content/governments/government-id/bcservicescardapp/help'

export enum HelpCentreUrl {
  HOME = 'https://id.gov.bc.ca/static/help/topics.html?fromapp=1',
  HOW_TO_SETUP = 'https://id.gov.bc.ca/static/help/setup_app.html?fromapp=1',
  ACCEPTED_IDENTITY_DOCUMENTS = 'https://id.gov.bc.ca/static/help/accepted-id.html?fromapp=1',
  VERIFICATION_METHODS = 'https://id.gov.bc.ca/static/help/verify_why.html?fromapp=1#section-options-app',
  VERIFY_IN_PERSON = 'https://id.gov.bc.ca/static/help/verify_why.html?fromapp=1#section-inperson',
  VERIFY_CALL = 'https://id.gov.bc.ca/static/help/verify_why.html#section-call',
  QUICK_SETUP_OF_ADDITIONAL_DEVICES = 'https://id.gov.bc.ca/static/help/setup_qrcode.html?fromapp=1',
  HELP_CHECK_BCSC = 'https://id.gov.bc.ca/static/help/cardhelp.html?fromapp=1',
  AUDIO_VIDEO_TROUBLESHOOTING = 'https://id.gov.bc.ca/static/help/audio_video_tips.html',
  FORGOT_PIN = 'https://id.gov.bc.ca/static/help/secure_app.html#section-forgotpin',
}

export const formStringLengths = {
  minimumLength: 1,
  maximumLength: 30,
} as const
export const PIN_LENGTH = 6
export const DEFAULT_AUTO_LOCK_TIME_MIN = 5
export const PAIRING_CODE_LENGTH = 6
export const RECONNECTION_GRACE_PERIOD_MS = 3000
export const KEEP_ALIVE_INTERVAL_MS = 30000
export const CROP_DELAY_MS = 11000

// Date time constants
export const ACCOUNT_EXPIRATION_DATE_FORMAT = 'MMMM D, YYYY'
export const ACCOUNT_EXPIRATION_WARNING_DAYS = 30

// BCSC Video constants
export const VIDEO_RESOLUTION_480P = { width: 640, height: 480 } // standard definition video resolution
export const PHOTO_RESOLUTION_720P = { width: 1280, height: 720 } // high definition photo resolution
export const SELFIE_VIDEO_FRAME_RATE = 24
export const MAX_SELFIE_VIDEO_DURATION_SECONDS = 30
export const DEFAULT_SELFIE_VIDEO_FILENAME = 'selfieVideo.mp4'
export const VIDEO_MP4_MIME_TYPE = 'video/mp4'
export const MIN_PROMPT_DURATION_SECONDS = 2

// File chunking constants
export const DEFAULT_CHUNK_SIZE = 1024 * 1024 // 1 MB

// Styling contants
export const DEFAULT_HEADER_TITLE_CONTAINER_STYLE: ViewStyle = { flexShrink: 1, maxWidth: '68%' }

// Barcode scanner constants
export const BC_SERVICES_CARD_BARCODE = 'code-39'
export const OLD_BC_SERVICES_CARD_BARCODE = 'code-128'
export const DRIVERS_LICENSE_BARCODE = 'pdf-417'

// Endpoint path constants
export const VERIFY_DEVICE_ASSERTION_PATH = 'v3/mobile/assertion'
