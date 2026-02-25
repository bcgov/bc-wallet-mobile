import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'
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
  })

  describe('when on iOS with fromAppSwitch', () => {
    beforeEach(() => {
      Platform.OS = 'ios'
    })

    it('shows the arrow and subtitle', () => {
      const route = { params: { ...defaultRoute.params, fromAppSwitch: true } }

      const { queryByAccessibilityHint, queryByText } = render(
        <BasicAppContext>
          <PairingConfirmation navigation={mockNavigation as never} route={route as never} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.ManualPairing.CompletionSubtitle')).toBeTruthy()
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

      expect(queryByText('BCSC.ManualPairing.CompletionSubtitle')).toBeNull()
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

      expect(queryByText('BCSC.ManualPairing.CompletionSubtitle')).toBeNull()
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
