import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { LockoutScreen } from '@/bcsc-theme/features/auth/LockoutScreen'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import * as BcscCore from 'react-native-bcsc-core'

const mockFactoryReset = jest.fn()

jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

describe('LockoutScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>
  let mockIsAccountLocked: jest.SpyInstance

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Mock isAccountLocked to return locked state with remaining time
    mockIsAccountLocked = jest.spyOn(BcscCore, 'isAccountLocked').mockResolvedValue({
      locked: true,
      remainingTime: 30, // 30 seconds
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('snapshots', () => {
    it('renders correctly when locked', async () => {
      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Too many PIN attempts')).toBeTruthy()
      })

      expect(tree).toMatchSnapshot()
    })
  })

  describe('time formatting', () => {
    it('displays time in minutes and seconds format', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: true,
        remainingTime: 90, // 1 minute 30 seconds
      })

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('1 minute 30 seconds')).toBeTruthy()
      })
    })

    it('displays singular minute correctly', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: true,
        remainingTime: 61, // 1 minute 1 second
      })

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('1 minute 1 second')).toBeTruthy()
      })
    })

    it('displays only seconds when under a minute', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: true,
        remainingTime: 45,
      })

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('45 seconds')).toBeTruthy()
      })
    })

    it('displays singular second correctly', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: true,
        remainingTime: 1,
      })

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('1 second')).toBeTruthy()
      })
    })
  })

  describe('navigation', () => {
    it('navigates to EnterPIN when account is not locked', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: false,
        remainingTime: 0,
      })

      render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'RESET',
            payload: expect.objectContaining({
              routes: [{ name: 'BCSCEnterPIN' }],
            }),
          })
        )
      })
    })

    it('navigates to EnterPIN when remaining time is 0', async () => {
      mockIsAccountLocked.mockResolvedValue({
        locked: true,
        remainingTime: 0,
      })

      render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'RESET',
            payload: expect.objectContaining({
              routes: [{ name: 'BCSCEnterPIN' }],
            }),
          })
        )
      })
    })
  })

  describe('error handling', () => {
    it('handles error when checking lock status gracefully', async () => {
      mockIsAccountLocked.mockRejectedValue(new Error('Network error'))

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      // Should still render the screen
      await waitFor(() => {
        expect(tree.getByText('Too many PIN attempts')).toBeTruthy()
      })
    })
  })

  describe('remove account', () => {
    it('calls factoryReset when Remove Account is pressed', async () => {
      mockFactoryReset.mockResolvedValue(undefined)

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Account.RemoveAccount')).toBeTruthy()
      })

      const removeButton = tree.getByTestId('com.ariesbifold:id/RemoveAccount')
      fireEvent.press(removeButton)

      await waitFor(() => {
        expect(mockFactoryReset).toHaveBeenCalled()
      })
    })

    it('handles error when factoryReset fails gracefully', async () => {
      mockFactoryReset.mockRejectedValue(new Error('Reset failed'))

      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Account.RemoveAccount')).toBeTruthy()
      })

      const removeButton = tree.getByTestId('com.ariesbifold:id/RemoveAccount')
      fireEvent.press(removeButton)

      // Should not throw - error is handled gracefully
      await waitFor(() => {
        expect(mockFactoryReset).toHaveBeenCalled()
      })
    })
  })

  describe('UI content', () => {
    it('displays all informational text', async () => {
      const tree = render(
        <BasicAppContext>
          <LockoutScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Too many PIN attempts')).toBeTruthy()
      })

      expect(
        tree.getByText("This app is temporarily locked because you've entered an incorrect PIN too many times.")
      ).toBeTruthy()
      expect(tree.getByText('You can try again in:')).toBeTruthy()
      expect(tree.getByText('Cannot remember your PIN?')).toBeTruthy()
      expect(
        tree.getByText(
          "We cannot help you get or reset your PIN if you forget it. It's only saved on this device. It's never shared with us."
        )
      ).toBeTruthy()
      expect(tree.getByText("If you've forgotten your PIN you'll need to set up this app again.")).toBeTruthy()
    })
  })
})
