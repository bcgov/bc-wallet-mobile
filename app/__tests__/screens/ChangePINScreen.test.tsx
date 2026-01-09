import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation, useRoute } from '../../__mocks__/@react-navigation/native'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ChangePINScreen } from '../../src/bcsc-theme/features/auth/ChangePINScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn().mockResolvedValue(false),
  setPIN: jest.fn(),
  verifyPIN: jest.fn(),
  setAccountSecurityMethod: jest.fn().mockResolvedValue(true),
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}))

const mockUseRoute = useRoute as jest.Mock

describe('ChangePINScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  describe('when changing existing PIN (isChangingExistingPIN = true)', () => {
    beforeEach(() => {
      mockUseRoute.mockReturnValue({
        params: { isChangingExistingPIN: true },
      })
    })

    it('renders ChangePINForm with current PIN field', () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangePINScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      expect(tree.getByText('BCSC.ChangePIN.EnterCurrentPIN')).toBeTruthy()
      expect(tree.getByText('BCSC.ChangePIN.EnterNewPIN')).toBeTruthy()
      expect(tree.getByText('BCSC.ChangePIN.ReenterNewPIN')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('shows change PIN button', () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangePINScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      expect(tree.getByText('BCSC.ChangePIN.ButtonTitle')).toBeTruthy()
    })
  })

  describe('when switching from Device Auth to PIN (isChangingExistingPIN = false)', () => {
    beforeEach(() => {
      mockUseRoute.mockReturnValue({
        params: { isChangingExistingPIN: false },
      })
    })

    it('renders PINEntryForm without current PIN field', () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangePINScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      // Should not have current PIN field
      expect(tree.queryByText('BCSC.ChangePIN.EnterCurrentPIN')).toBeNull()
      // Should have create/confirm PIN fields
      expect(tree.getByText('BCSC.PIN.CreatePIN')).toBeTruthy()
      expect(tree.getByText('BCSC.PIN.ConfirmPIN')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('shows continue button instead of change PIN button', () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangePINScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      expect(tree.getByText('Global.Continue')).toBeTruthy()
    })
  })

  describe('when no params provided', () => {
    beforeEach(() => {
      mockUseRoute.mockReturnValue({
        params: undefined,
      })
    })

    it('defaults to PINEntryForm (switching from Device Auth)', () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangePINScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      // Should show create PIN form, not change PIN form
      expect(tree.getByText('BCSC.PIN.CreatePIN')).toBeTruthy()
      expect(tree.queryByText('BCSC.ChangePIN.EnterCurrentPIN')).toBeNull()
    })
  })
})
