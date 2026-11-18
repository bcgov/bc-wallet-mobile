import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useEvidenceService } from '@/bcsc-theme/services/hooks/useEvidenceService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { VerificationRequestStatus } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useFocusEffect } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import PendingReviewScreen from './PendingReviewScreen'

// Real screen, hook and store: only the network services and navigation are replaced
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/services/hooks/useEvidenceService')
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ updateVerificationRequest: jest.fn(), updateAccountFlags: jest.fn() }),
}))

// The shared mock hands out a new `t` on every render, which would re-fire the focus effect on any re-render
// while the screen stays focused; the real one is stable
jest.mock('react-i18next', () => {
  const t = (key: string) => key
  const result = { t, i18n: { language: 'en', changeLanguage: jest.fn(), t } }
  return { useTranslation: () => result, Trans: () => null, initReactI18next: { type: '3rdParty', init: jest.fn() } }
})

const pendingRequest = { verificationRequestId: 'request-id', deviceCode: 'device-code', userCode: 'user-code' }

describe('PendingReviewScreen with the real status check', () => {
  const getVerificationRequestStatus = jest.fn()
  let dispatch: (action: { type: BCDispatchAction; payload?: unknown[] }) => void
  let currentStore: BCState
  let focused: boolean
  let navigation: any

  const CaptureDispatch = () => {
    const [store, storeDispatch] = useStore<BCState>()
    currentStore = store
    dispatch = storeDispatch as typeof dispatch
    return null
  }

  const renderScreen = () =>
    render(
      <BasicAppContext initialStateOverride={{ bcscSecure: pendingRequest as any }}>
        <CaptureDispatch />
        <PendingReviewScreen navigation={navigation} />
      </BasicAppContext>
    )

  const flush = () => act(async () => undefined)

  const callsTo = (screen: BCSCScreens) => navigation.navigate.mock.calls.filter(([name]: [string]) => name === screen)

  beforeEach(() => {
    jest.clearAllMocks()
    focused = true
    // Navigating to another screen blurs this one at once; navigating to itself is a no-op, so it stays focused
    navigation = {
      isFocused: () => focused,
      navigate: jest.fn((name: BCSCScreens) => {
        if (name !== BCSCScreens.PendingReview) {
          focused = false
        }
      }),
      reset: jest.fn(),
    }
    // Mirrors the real hook: the callback runs while focused, and again whenever its identity changes
    jest.mocked(useFocusEffect).mockImplementation((callback: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => (focused ? callback() : undefined), [callback])
    })
    jest.mocked(useEvidenceService).mockReturnValue({ getVerificationRequestStatus } as any)
    jest.mocked(useApi).mockReturnValue({
      token: {
        // The real exchange stores the issued tokens, which flips the user to "device verified"
        checkDeviceCodeStatus: jest.fn(async () => {
          dispatch({ type: BCDispatchAction.UPDATE_SECURE_REFRESH_TOKEN, payload: ['refresh-token'] })
        }),
      },
    } as any)
  })

  it('fetches once and stays on the pending screen when the request is still pending', async () => {
    getVerificationRequestStatus.mockResolvedValue({ status: VerificationRequestStatus.PENDING })

    renderScreen()
    await flush()

    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(1)
    expect(callsTo(BCSCScreens.CancelledReview)).toHaveLength(0)
    expect(callsTo(BCSCScreens.VerificationSuccess)).toHaveLength(0)
  })

  it('fetches once and opens the cancelled review once when the request was cancelled', async () => {
    getVerificationRequestStatus.mockResolvedValue({
      status: VerificationRequestStatus.CANCELLED,
      status_message: 'Video too dark',
    })

    renderScreen()
    await flush()

    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(1)
    expect(callsTo(BCSCScreens.CancelledReview)).toEqual([
      [BCSCScreens.CancelledReview, { agentReason: 'Video too dark' }],
    ])
  })

  it('fetches once, exchanges once and opens success once when the request was verified', async () => {
    getVerificationRequestStatus.mockResolvedValue({ status: VerificationRequestStatus.VERIFIED })

    renderScreen()
    await flush()

    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(1)
    expect(jest.mocked(useApi)().token.checkDeviceCodeStatus).toHaveBeenCalledTimes(1)
    expect(callsTo(BCSCScreens.VerificationSuccess)).toHaveLength(1)
  })

  it('acts on a decision pushed while a pending check is still in flight, without opening it twice', async () => {
    let settleFirstFetch: (value: { status: VerificationRequestStatus }) => void = () => undefined
    getVerificationRequestStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        settleFirstFetch = resolve
      })
    )
    getVerificationRequestStatus.mockResolvedValue({
      status: VerificationRequestStatus.CANCELLED,
      status_message: 'Video too dark',
    })

    renderScreen()
    await flush()
    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      dispatch({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status: VerificationRequestStatus.CANCELLED, status_message: 'Video too dark' }],
      })
    })
    await act(async () => {
      settleFirstFetch({ status: VerificationRequestStatus.PENDING })
    })
    await flush()

    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(2)
    expect(callsTo(BCSCScreens.CancelledReview)).toHaveLength(1)
  })

  it('keeps a decision pushed during a check when that check answers pending and the follow-up check fails', async () => {
    let settleFirstFetch: (value: { status: VerificationRequestStatus }) => void = () => undefined
    getVerificationRequestStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        settleFirstFetch = resolve
      })
    )
    // Offline: the check the push triggers cannot correct a wrong answer
    getVerificationRequestStatus.mockRejectedValue(new Error('offline'))

    renderScreen()
    await flush()

    await act(async () => {
      dispatch({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status: VerificationRequestStatus.CANCELLED, status_message: 'Video too dark' }],
      })
    })
    await act(async () => {
      settleFirstFetch({ status: VerificationRequestStatus.PENDING })
    })
    await flush()

    expect(getVerificationRequestStatus).toHaveBeenCalledTimes(2)
    expect(currentStore.bcscSecure.verificationRequestStatus).toBe(VerificationRequestStatus.CANCELLED)
    expect(currentStore.bcscSecure.verificationRequestStatusMessage).toBe('Video too dark')
  })
})
