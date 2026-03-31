import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { AppState, AppStateStatus, BackHandler, Platform } from 'react-native'
import PairingConfirmation from './PairingConfirmation'

describe('PairingConfirmation', () => {
  let mockNavigation: any
  const defaultRoute = {
    params: {
      serviceName: 'Test Service',
      serviceId: 'test-id',
    },
  }

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as any)
  })

  describe('when on iOS with fromAppSwitch', () => {
    beforeEach(() => {
      Platform.OS = 'ios'
    })

    it('shows the arrow and subtitle', () => {
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.FromAppSwitchCompletionSubtitle')).toBeTruthy()
    })

    it('does not show the Close button', () => {
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { queryByTestId } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      expect(queryByTestId('com.ariesbifold:id/Close')).toBeNull()
    })

    it('navigates home when the app returns from background', () => {
      let appStateCallback: (state: AppStateStatus) => void
      const removeSpy = jest.fn()
      const addEventSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
        appStateCallback = callback as (state: AppStateStatus) => void
        return { remove: removeSpy } as any
      })

      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      // Simulate background → foreground transition
      appStateCallback!('background')
      appStateCallback!('active')

      expect(mockNavigation.dispatch).toHaveBeenCalled()
      addEventSpy.mockRestore()
    })

    it('does not navigate home on inactive → active (e.g. notification center dismissal)', () => {
      let appStateCallback: (state: AppStateStatus) => void
      const removeSpy = jest.fn()
      const addEventSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
        appStateCallback = callback as (state: AppStateStatus) => void
        return { remove: removeSpy } as any
      })

      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      // Simulate inactive → active (e.g. pulling down notification center)
      appStateCallback!('inactive')
      appStateCallback!('active')

      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      addEventSpy.mockRestore()
    })
  })

  describe('when on iOS without fromAppSwitch', () => {
    beforeEach(() => {
      Platform.OS = 'ios'
    })

    it('does not show the subtitle', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.FromAppSwitchCompletionSubtitle')).toBeNull()
    })

    it('shows the Close button', () => {
      const { queryByTestId } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      expect(queryByTestId('com.ariesbifold:id/Close')).toBeTruthy()
    })
  })

  describe('when on Android with fromAppSwitch', () => {
    beforeEach(() => {
      Platform.OS = 'android'
    })

    it('does not show the subtitle', () => {
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.FromAppSwitchCompletionSubtitle')).toBeNull()
    })

    it('shows the Close button', () => {
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { queryByTestId } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      expect(queryByTestId('com.ariesbifold:id/Close')).toBeTruthy()
    })

    it('navigates home when the app goes to background', () => {
      let appStateCallback: (state: AppStateStatus) => void
      const removeSpy = jest.fn()
      const addEventSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
        appStateCallback = callback as (state: AppStateStatus) => void
        return { remove: removeSpy } as any
      })

      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      appStateCallback!('background')

      expect(mockNavigation.dispatch).toHaveBeenCalled()
      addEventSpy.mockRestore()
    })

    it('calls BackHandler.exitApp when Close is pressed', () => {
      const exitAppSpy = jest.spyOn(BackHandler, 'exitApp').mockImplementation(jest.fn())
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { getByTestId } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      fireEvent.press(getByTestId('com.ariesbifold:id/Close'))

      expect(exitAppSpy).toHaveBeenCalled()
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      exitAppSpy.mockRestore()
    })
  })

  describe('when without fromAppSwitch', () => {
    it('does not register an AppState listener', () => {
      Platform.OS = 'android'
      const addEventSpy = jest.spyOn(AppState, 'addEventListener')

      render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      expect(addEventSpy).not.toHaveBeenCalled()
      addEventSpy.mockRestore()
    })

    it('resets navigation to the Tab stack when Close is pressed', () => {
      Platform.OS = 'android'

      const { getByTestId } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      fireEvent.press(getByTestId('com.ariesbifold:id/Close'))

      expect(mockNavigation.dispatch).toHaveBeenCalled()
    })
  })

  describe('common elements', () => {
    it('always shows the completion title', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.CompletionTitle')).toBeTruthy()
    })

    it('always shows the completion description', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={defaultRoute as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.CompletionDescription')).toBeTruthy()
    })
  })
})
