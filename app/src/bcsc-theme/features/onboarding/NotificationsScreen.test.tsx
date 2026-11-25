import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, useStore } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect } from '@react-navigation/native'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { NotificationsScreen } from './NotificationsScreen'

const NPStatus = { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' }

const mockStatus = jest.fn()
const mockSetup = jest.fn()
const mockHasPrompted = jest.fn()

jest.mock('@/utils/PushNotificationsHelper', () => ({
  NotificationPermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' },
  status: (...args: unknown[]) => mockStatus(...args),
  setup: (...args: unknown[]) => mockSetup(...args),
  hasPromptedForNotifications: (...args: unknown[]) => mockHasPrompted(...args),
}))

const ids = TestIds.onboarding.notifications
const tid = (key: string) => testIdWithKey(key)

const PreferenceProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="preference-probe">{String(store.preferences.usePushNotifications)}</Text>
}

const preference = () => screen.getByTestId('preference-probe').props.children

const stateWithPreference = (usePushNotifications: boolean) =>
  ({ preferences: { ...initialState.preferences, usePushNotifications } }) as Partial<BCState>

describe('Notifications', () => {
  let mockNavigation: any

  const renderScreen = (usePushNotifications = false) =>
    render(
      <BasicAppContext initialStateOverride={stateWithPreference(usePushNotifications)}>
        <NotificationsScreen navigation={mockNavigation as never} />
        <PreferenceProbe />
      </BasicAppContext>
    )

  // Jest mocks useFocusEffect as a no-op: run the latest registered effect as a focus would
  const focusScreen = async () => {
    await act(async () => {
      jest.mocked(useFocusEffect).mock.calls.at(-1)![0]()
    })
  }

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    mockStatus.mockResolvedValue(NPStatus.UNKNOWN)
    mockSetup.mockResolvedValue(NPStatus.GRANTED)
    mockHasPrompted.mockResolvedValue(false)
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  describe('permission already allowed', () => {
    it('shows only Continue', async () => {
      mockStatus.mockResolvedValue(NPStatus.GRANTED)
      mockHasPrompted.mockResolvedValue(true)

      renderScreen()

      expect(await screen.findByTestId(tid(ids.continue))).toBeTruthy()
      expect(screen.queryByTestId(tid(ids.enable))).toBeNull()
      expect(screen.queryByTestId(tid(ids.skip))).toBeNull()
    })

    it('switches to Continue only when the screen regains focus after the permission was allowed', async () => {
      renderScreen()
      expect(await screen.findByTestId(tid(ids.enable))).toBeTruthy()

      mockStatus.mockResolvedValue(NPStatus.GRANTED)
      await focusScreen()

      expect(await screen.findByTestId(tid(ids.continue))).toBeTruthy()
      expect(screen.queryByTestId(tid(ids.enable))).toBeNull()
      expect(screen.queryByTestId(tid(ids.skip))).toBeNull()
    })

    it('shows Continue only after Enable is answered with Allow, and moves on to Secure App', async () => {
      renderScreen(false)
      fireEvent.press(await screen.findByTestId(tid(ids.enable)))

      // The OS answer lands after the first read: status() and setup() are independent
      mockStatus.mockResolvedValue(NPStatus.GRANTED)
      await waitFor(() => expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp))
      expect(preference()).toBe('true')

      expect(await screen.findByTestId(tid(ids.continue))).toBeTruthy()
      expect(screen.queryByTestId(tid(ids.enable))).toBeNull()
      expect(screen.queryByTestId(tid(ids.skip))).toBeNull()
    })

    it('Continue keeps notifications on without asking again, and goes to Secure App', async () => {
      mockStatus.mockResolvedValue(NPStatus.GRANTED)
      mockHasPrompted.mockResolvedValue(true)

      // The stored preference lags the OS permission, e.g. allowed from OS Settings
      renderScreen(false)
      const continueButton = await screen.findByTestId(tid(ids.continue))
      expect(preference()).toBe('false')

      fireEvent.press(continueButton)

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp)
      await waitFor(() => expect(preference()).toBe('true'))
      expect(mockSetup).not.toHaveBeenCalled()
    })
  })

  describe('permission not yet allowed', () => {
    it('offers Enable and Skip when the permission was never requested', async () => {
      renderScreen()

      expect(await screen.findByTestId(tid(ids.enable))).toBeTruthy()
      expect(screen.getByTestId(tid(ids.skip))).toBeTruthy()
      expect(screen.queryByTestId(tid(ids.continue))).toBeNull()
    })

    it('offers Enable and Skip when Android reports denied before the first prompt', async () => {
      mockStatus.mockResolvedValue(NPStatus.DENIED)
      mockHasPrompted.mockResolvedValue(false)

      renderScreen()

      expect(await screen.findByTestId(tid(ids.enable))).toBeTruthy()
      expect(screen.getByTestId(tid(ids.skip))).toBeTruthy()
      expect(screen.queryByTestId(tid(ids.continue))).toBeNull()
    })

    it('Skip turns notifications off and goes to Secure App', async () => {
      renderScreen(true)

      fireEvent.press(await screen.findByTestId(tid(ids.skip)))

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp)
      await waitFor(() => expect(preference()).toBe('false'))
    })
  })

  describe('permission denied', () => {
    it.each([NPStatus.DENIED, NPStatus.BLOCKED])(
      'shows the disabled variant when %s after a prompt',
      async (status) => {
        mockStatus.mockResolvedValue(status)
        mockHasPrompted.mockResolvedValue(true)

        renderScreen()

        expect(await screen.findByTestId(tid(ids.openSettings))).toBeTruthy()
        expect(screen.getByTestId(tid(ids.continueWithout))).toBeTruthy()
        expect(screen.queryByTestId(tid(ids.continue))).toBeNull()
        expect(screen.queryByTestId(tid(ids.enable))).toBeNull()
      }
    )

    it('turns notifications off, goes to Secure App and shows the disabled variant when Enable is refused', async () => {
      mockSetup.mockResolvedValue(NPStatus.DENIED)
      // Android keeps reporting denied, so only the local prompt record can swap the variant in
      mockStatus.mockResolvedValue(NPStatus.DENIED)

      renderScreen(true)
      fireEvent.press(await screen.findByTestId(tid(ids.enable)))

      await waitFor(() => expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp))
      expect(preference()).toBe('false')
      expect(await screen.findByTestId(tid(ids.openSettings))).toBeTruthy()
    })

    it('keeps a recorded refusal when a late prompt-history read says never prompted', async () => {
      let resolveHasPrompted: (value: boolean) => void = () => undefined
      mockHasPrompted.mockReturnValue(new Promise<boolean>((resolve) => (resolveHasPrompted = resolve)))
      mockSetup.mockResolvedValue(NPStatus.DENIED)
      mockStatus.mockResolvedValue(NPStatus.DENIED)

      renderScreen(true)
      fireEvent.press(await screen.findByTestId(tid(ids.enable)))
      expect(await screen.findByTestId(tid(ids.openSettings))).toBeTruthy()

      await act(async () => resolveHasPrompted(false))

      expect(screen.getByTestId(tid(ids.openSettings))).toBeTruthy()
    })

    it('turns notifications off and still goes to Secure App when the request fails', async () => {
      mockSetup.mockRejectedValue(new Error('request failed'))

      renderScreen(true)
      fireEvent.press(await screen.findByTestId(tid(ids.enable)))

      await waitFor(() => expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp))
      expect(preference()).toBe('false')
    })
  })
})
