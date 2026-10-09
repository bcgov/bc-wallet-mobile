import { CONTACT_US_HELP_URL } from '@/constants'
import { openLink } from '@/utils/links'
import { act, renderHook } from '@testing-library/react-native'
import useServiceNoticeViewModel from './useServiceNoticeViewModel'

let mockServerStatus: ReturnType<typeof makeServerStatus>

const makeServerStatus = (overrides: Record<string, unknown> = {}) => ({
  isAvailable: true,
  statusMessage: 'Scheduled maintenance on Saturday' as string | undefined,
  contactLink: 'https://example.com/contact-us.html' as string | undefined,
  serverStatus: null,
  isChecking: false,
  hasChecked: true,
  refresh: jest.fn(),
  ...overrides,
})

jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockServerStatus,
}))

jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
}))

describe('useServiceNoticeViewModel', () => {
  beforeEach(() => {
    mockServerStatus = makeServerStatus()
  })

  it('returns localized text and the status message', () => {
    const { result } = renderHook(() => useServiceNoticeViewModel())

    expect(result.current.headerText).toBe('BCSC.ServiceNotice.Header')
    expect(result.current.messageText).toBe('Scheduled maintenance on Saturday')
    expect(result.current.haveQuestionsText).toBe('BCSC.ServiceNotice.HaveQuestions')
    expect(result.current.contactUsLinkText).toBe('BCSC.ServiceNotice.ContactUsLink')
  })

  it('adds the fixed guidance sections under the notice', () => {
    const { result } = renderHook(() => useServiceNoticeViewModel())

    expect(result.current.sections).toEqual([
      {
        heading: 'BCSC.ServiceNotice.MobileCardHeading',
        description: 'BCSC.ServiceNotice.MobileCardDescription',
        bullets: ['BCSC.ServiceNotice.MobileCardVideoCall', 'BCSC.ServiceNotice.MobileCardSendVideo'],
      },
      {
        heading: 'BCSC.ServiceNotice.LoginHeading',
        description: 'BCSC.ServiceNotice.LoginDescription',
      },
    ])
  })

  it('says the notice is unavailable, without guidance, when the server status has no message', () => {
    mockServerStatus = makeServerStatus({ statusMessage: undefined })

    const { result } = renderHook(() => useServiceNoticeViewModel())

    expect(result.current.messageText).toBe('BCSC.ServiceNotice.NoticeUnavailable')
    expect(result.current.sections).toEqual([])
  })

  it('opens the contact link from the server status', () => {
    const { result } = renderHook(() => useServiceNoticeViewModel())

    act(() => result.current.handleContactUs())

    expect(openLink).toHaveBeenCalledWith('https://example.com/contact-us.html')
  })

  it('falls back to the default contact URL when the server does not provide one', () => {
    mockServerStatus = makeServerStatus({ contactLink: undefined })

    const { result } = renderHook(() => useServiceNoticeViewModel())

    act(() => result.current.handleContactUs())

    expect(openLink).toHaveBeenCalledWith(CONTACT_US_HELP_URL)
  })
})
