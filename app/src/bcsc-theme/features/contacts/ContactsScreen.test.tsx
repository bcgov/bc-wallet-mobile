/* eslint-disable @typescript-eslint/no-explicit-any */
import { DidCommConnectionType, DidCommDidExchangeState } from '@credo-ts/didcomm'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import ContactsScreen from './ContactsScreen'

const mockUseConnections = jest.fn()
const mockNavigate = jest.fn()

jest.mock('@bifold/react-hooks', () => ({
  useConnections: () => mockUseConnections(),
  useBasicMessagesByConnectionId: () => [],
  useCredentialsByConnectionId: () => [],
  useProofsByConnectionId: () => [],
}))

jest.mock('@bifold/core', () => {
  // Jest forbids referencing out-of-scope identifiers in a mock factory, so
  // re-require React here instead of relying on the top-level import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    Button: ({ title, onPress, testID }: any) =>
      ReactInFactory.createElement('Pressable', { testID, onPress }, ReactInFactory.createElement('Text', null, title)),
    ButtonType: { Primary: 'Primary' },
    ScreenWrapper: ({ children }: any) => ReactInFactory.createElement('View', null, children),
    ThemedText: ({ children }: any) => ReactInFactory.createElement('Text', null, children),
    testIdWithKey: (k: string) => `id/${k}`,
    formatTime: () => 'date-stub',
    getConnectionName: (record: any) => record?.theirLabel ?? record?.alias ?? '',
    useStore: () => [{ preferences: { alternateContactNames: {} } }],
    useTheme: () => ({
      ColorPalette: {
        brand: {
          primary: '#000',
          primaryBackground: '#fff',
          primaryLight: '#eee',
          secondaryBackground: '#ccc',
          text: '#000',
        },
        grayscale: { mediumGrey: '#888', black: '#000' },
        semantic: { error: '#f00' },
      },
      Spacing: { sm: 4, md: 8, lg: 16, xs: 2 },
    }),
  }
})

jest.mock('./services/usePinnedContacts', () => ({
  usePinnedContacts: () => ({ pinnedIds: new Set(), isPinned: () => false, togglePin: jest.fn() }),
}))

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'CommunityIcon')

const completedConnection = (overrides: any = {}) => ({
  id: 'conn-1',
  state: DidCommDidExchangeState.Completed,
  connectionTypes: [],
  theirLabel: 'Acme Corp',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
})

describe('ContactsScreen', () => {
  beforeEach(() => {
    mockUseConnections.mockReset()
    mockNavigate.mockReset()
  })

  const renderScreen = () => render(<ContactsScreen navigation={{ navigate: mockNavigate } as any} />)

  it('renders the empty state when there are no completed connections', () => {
    mockUseConnections.mockReturnValue({ records: [] })
    renderScreen()
    expect(screen.getByText('BCSC.Contacts.EmptyTitle')).toBeTruthy()
    expect(screen.getByTestId('id/WhatAreContacts')).toBeTruthy()
  })

  it('navigates to WhatAreContacts from the empty state', () => {
    mockUseConnections.mockReturnValue({ records: [] })
    renderScreen()
    fireEvent.press(screen.getByTestId('id/WhatAreContacts'))
    expect(mockNavigate).toHaveBeenCalledWith('What are Contacts')
  })

  it('excludes mediator connections from the visible list', () => {
    mockUseConnections.mockReturnValue({
      records: [completedConnection({ id: 'mediator', connectionTypes: [DidCommConnectionType.Mediator] })],
    })
    renderScreen()
    // Only mediator-typed contacts exist → empty state should still render.
    expect(screen.getByText('BCSC.Contacts.EmptyTitle')).toBeTruthy()
  })

  it('excludes connections that are not in Completed state', () => {
    mockUseConnections.mockReturnValue({
      records: [completedConnection({ state: DidCommDidExchangeState.RequestSent })],
    })
    renderScreen()
    expect(screen.getByText('BCSC.Contacts.EmptyTitle')).toBeTruthy()
  })

  it('renders a list when there are completed, non-mediator connections', () => {
    mockUseConnections.mockReturnValue({
      records: [
        completedConnection({ id: 'a', theirLabel: 'Acme Corp' }),
        completedConnection({ id: 'b', theirLabel: 'Beta Inc' }),
      ],
    })
    renderScreen()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('Beta Inc')).toBeTruthy()
    expect(screen.getByTestId('id/SearchContacts')).toBeTruthy()
  })

  it('filters the list by search query', () => {
    mockUseConnections.mockReturnValue({
      records: [
        completedConnection({ id: 'a', theirLabel: 'Acme Corp' }),
        completedConnection({ id: 'b', theirLabel: 'Beta Inc' }),
      ],
    })
    renderScreen()
    fireEvent.changeText(screen.getByTestId('id/SearchContacts'), 'beta')
    expect(screen.queryByText('Acme Corp')).toBeNull()
    expect(screen.getByText('Beta Inc')).toBeTruthy()
  })
})
