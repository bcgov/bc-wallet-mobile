/* eslint-disable @typescript-eslint/no-explicit-any */
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import ContactDetailsScreen from './ContactDetailsScreen'

const mockUseConnectionById = jest.fn()
const mockIsPinned = jest.fn()
const mockTogglePin = jest.fn()
const mockFormatTime = jest.fn()
const mockNavigate = jest.fn()

// Mutable store so individual tests can flip developer mode.
const mockStore = { preferences: { alternateContactNames: {} as Record<string, string>, developerModeEnabled: false } }

jest.mock('@bifold/react-hooks', () => ({
  useConnectionById: (id: string) => mockUseConnectionById(id),
}))

jest.mock('./services/usePinnedContacts', () => ({
  usePinnedContacts: () => ({ isPinned: mockIsPinned, togglePin: mockTogglePin }),
}))

jest.mock('@bifold/core', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    ScreenWrapper: ({ children }: any) => ReactInFactory.createElement('View', null, children),
    ThemedText: ({ children }: any) => ReactInFactory.createElement('Text', null, children),
    testIdWithKey: (k: string) => `id/${k}`,
    formatTime: (...args: any[]) => mockFormatTime(...args),
    getConnectionName: (record: any) => record?.theirLabel ?? record?.alias ?? '',
    useStore: () => [mockStore],
    useTheme: () => ({
      ColorPalette: {
        brand: { primary: '#000' },
        grayscale: { black: '#000' },
        semantic: { error: '#f00' },
      },
      Spacing: { xs: 2, sm: 4, md: 8, lg: 16 },
    }),
  }
})

// Lightweight ListButton stand-ins: expose testID/onPress so presses can be asserted.
jest.mock('@/bcsc-theme/components/ListButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    ListButtonGroup: ({ children }: any) => ReactInFactory.createElement('View', null, children),
    ListButton: ({ children, onPress, testID, accessibilityLabel }: any) =>
      ReactInFactory.createElement('Pressable', { testID, onPress, accessibilityLabel }, children),
  }
})

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'CommunityIcon')
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

const navigation = { navigate: mockNavigate } as any
const route = { params: { connectionId: 'conn-1' } } as any

const renderScreen = () => render(<ContactDetailsScreen navigation={navigation} route={route} />)

describe('ContactDetailsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockIsPinned.mockReset().mockReturnValue(false)
    mockTogglePin.mockReset()
    mockFormatTime.mockReset().mockReturnValue('date-stub')
    mockStore.preferences.developerModeEnabled = false
    mockUseConnectionById.mockReset().mockReturnValue({
      id: 'conn-1',
      theirLabel: 'Acme Corp',
      createdAt: new Date(0),
      toJSON: () => ({ id: 'conn-1' }),
    })
  })

  it('renders the contact name and the connected-at timestamp', () => {
    renderScreen()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('BCSC.Contacts.Details.ConnectedAt')).toBeTruthy()
    expect(mockFormatTime).toHaveBeenCalledWith(new Date(0), { includeHour: true })
  })

  it('omits the connected-at timestamp when the connection has no createdAt', () => {
    mockUseConnectionById.mockReturnValue({ id: 'conn-1', theirLabel: 'Acme Corp' })
    renderScreen()
    expect(screen.queryByText('BCSC.Contacts.Details.ConnectedAt')).toBeNull()
    expect(mockFormatTime).not.toHaveBeenCalled()
  })

  it('shows the Pin action (not Unpin) when the contact is not pinned', () => {
    mockIsPinned.mockReturnValue(false)
    renderScreen()
    expect(screen.getByTestId('id/PinContact')).toBeTruthy()
    expect(screen.queryByTestId('id/UnpinContact')).toBeNull()
  })

  it('shows the Unpin action when the contact is pinned', () => {
    mockIsPinned.mockReturnValue(true)
    renderScreen()
    expect(screen.getByTestId('id/UnpinContact')).toBeTruthy()
    expect(screen.queryByTestId('id/PinContact')).toBeNull()
  })

  it('navigates to the chat screen when Message is pressed', () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('id/MessageContact'))
    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.ContactChat, { connectionId: 'conn-1' })
  })

  it('toggles the pin when the Pin action is pressed', () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('id/PinContact'))
    expect(mockTogglePin).toHaveBeenCalledWith('conn-1')
  })

  it('navigates to the edit-name screen when Edit is pressed', () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('id/EditContactName'))
    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.EditContactName, { connectionId: 'conn-1' })
  })

  it('navigates to the remove screen when Remove is pressed', () => {
    renderScreen()
    fireEvent.press(screen.getByTestId('id/RemoveContact'))
    expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.RemoveContact, { connectionId: 'conn-1' })
  })

  it('hides the View JSON action when developer mode is disabled', () => {
    mockStore.preferences.developerModeEnabled = false
    renderScreen()
    expect(screen.queryByTestId('id/ViewJSON')).toBeNull()
  })

  it('shows View JSON in developer mode and navigates with the serialized connection', () => {
    mockStore.preferences.developerModeEnabled = true
    renderScreen()
    fireEvent.press(screen.getByTestId('id/ViewJSON'))
    expect(mockNavigate).toHaveBeenCalledWith(
      BCSCScreens.ContactJSONDetails,
      expect.objectContaining({ jsonBlob: expect.stringContaining('"id": "conn-1"') })
    )
  })

  it('falls back to the raw connection object when toJSON is unavailable', () => {
    mockStore.preferences.developerModeEnabled = true
    mockUseConnectionById.mockReturnValue({ id: 'conn-2', theirLabel: 'Beta Inc' })
    renderScreen()
    fireEvent.press(screen.getByTestId('id/ViewJSON'))
    expect(mockNavigate).toHaveBeenCalledWith(
      BCSCScreens.ContactJSONDetails,
      expect.objectContaining({ jsonBlob: expect.stringContaining('"id": "conn-2"') })
    )
  })

  it('renders without crashing when the connection is missing', () => {
    mockStore.preferences.developerModeEnabled = true
    mockUseConnectionById.mockReturnValue(undefined)
    renderScreen()
    // Empty-object fallback for the JSON blob.
    fireEvent.press(screen.getByTestId('id/ViewJSON'))
    expect(mockNavigate).toHaveBeenCalledWith(
      BCSCScreens.ContactJSONDetails,
      expect.objectContaining({ jsonBlob: '{}' })
    )
  })
})
