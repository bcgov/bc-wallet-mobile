/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import ContactChatScreen from './ContactChatScreen'

const mockUseContactChat = jest.fn()
const mockOnSend = jest.fn()
const mockSetOptions = jest.fn()

// Mutable store so individual tests can flip developer mode.
const mockStore = { preferences: { developerModeEnabled: false } }

jest.mock('./services/useContactChat', () => ({
  useContactChat: (connectionId: string, navigation: any) => mockUseContactChat(connectionId, navigation),
}))

jest.mock('@bifold/core', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    ThemedText: ({ children, style }: any) => ReactInFactory.createElement('Text', { style }, children),
    testIdWithKey: (k: string) => `id/${k}`,
    formatTime: () => 'time-stub',
    useStore: () => [mockStore],
    useTheme: () => ({
      ColorPalette: {
        brand: {
          primary: '#00f',
          primaryBackground: '#fff',
          primaryLight: '#eef',
          secondaryBackground: '#fafafa',
          text: '#fff',
        },
        grayscale: {
          white: '#fff',
          veryLightGrey: '#eee',
          lightGrey: '#ccc',
          mediumGrey: '#888',
          darkGrey: '#333',
        },
      },
      Spacing: { xs: 2, sm: 4, md: 8, lg: 16 },
    }),
  }
})

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 0,
}))

// Pass-through stand-ins that surface props (testID etc.) and invoke the
// screen's render callbacks the way GiftedChat would.
jest.mock('react-native-gifted-chat', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    GiftedChat: (props: any) =>
      ReactInFactory.createElement(
        'View',
        null,
        props.messages?.map((m: any) => props.renderMessage?.({ currentMessage: m })),
        props.renderMessage?.({}),
        props.renderInputToolbar?.({}),
        props.renderComposer?.({ textInputProps: {} }),
        props.renderSend?.({ text: 'draft' }),
        props.renderSend?.({ text: '' }),
        props.renderActions?.({})
      ),
    InputToolbar: (props: any) => ReactInFactory.createElement('View', { testID: 'input-toolbar' }, props.children),
    Composer: ({ textInputProps }: any) => ReactInFactory.createElement('TextInput', { ...textInputProps }),
    Send: ({ children, sendButtonProps }: any) =>
      ReactInFactory.createElement('Pressable', { ...sendButtonProps }, children),
    Actions: (props: any) => ReactInFactory.createElement('View', { testID: 'chat-actions' }, props.icon?.()),
  }
})

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'CommunityIcon')

const navigation = { setOptions: mockSetOptions } as any
const route = { params: { connectionId: 'conn-1' } } as any

const textItem = { _id: 'm1', kind: 'text', role: 'me', text: 'Hello there', createdAt: new Date(0) }
const textItemThem = { _id: 'm5', kind: 'text', role: 'them', text: 'Hi back', createdAt: new Date(0) }
const connectedItem = { _id: 'm2', kind: 'connected', role: 'me', createdAt: new Date(0) }
const mockOnView = jest.fn()
const eventItem = {
  _id: 'm3',
  kind: 'proofEvent',
  role: 'them',
  eventLabelKey: 'Chat.ProofRequestReceived',
  createdAt: new Date(0),
  onView: mockOnView,
}
const eventItemNoView = { _id: 'm4', kind: 'credentialEvent', role: 'me', createdAt: new Date(0) }

const renderScreen = () => render(<ContactChatScreen navigation={navigation} route={route} />)

describe('ContactChatScreen', () => {
  beforeEach(() => {
    mockStore.preferences.developerModeEnabled = false
    mockUseContactChat.mockReset().mockReturnValue({
      items: [textItem, textItemThem, connectedItem, eventItem, eventItemNoView],
      theirLabel: 'Acme Corp',
      onSend: mockOnSend,
      isAgentReady: true,
    })
  })

  it('sets the header title to the contact label', () => {
    renderScreen()
    expect(mockSetOptions).toHaveBeenCalledWith({ title: 'Acme Corp' })
  })

  it('renders the composer with testID, placeholder, and editable when the agent is ready', () => {
    renderScreen()
    const composer = screen.getByTestId('id/ChatComposer')
    expect(composer.props.placeholder).toBe('BCSC.Contacts.Chat.Placeholder')
    expect(composer.props.editable).toBe(true)
  })

  it('disables the composer while the agent is not ready', () => {
    mockUseContactChat.mockReturnValue({ items: [], theirLabel: 'Acme Corp', onSend: mockOnSend, isAgentReady: false })
    renderScreen()
    expect(screen.getByTestId('id/ChatComposer').props.editable).toBe(false)
  })

  it('renders the send button with testID', () => {
    renderScreen()
    expect(screen.getAllByTestId('id/SendMessage').length).toBeGreaterThan(0)
  })

  it('renders text, connected, and event messages', () => {
    renderScreen()
    expect(screen.getByText('Hello there')).toBeTruthy()
    expect(screen.getByText('Hi back')).toBeTruthy()
    expect(screen.getByText(/Chat\.YouConnected/)).toBeTruthy()
    expect(screen.getByText('Chat.ProofRequestReceived')).toBeTruthy()
  })

  it('invokes onView when the View Request action is pressed', () => {
    renderScreen()
    // Only the event item with an onView handler shows the button.
    fireEvent.press(screen.getByTestId('id/ViewRequest'))
    expect(mockOnView).toHaveBeenCalled()
  })

  it('hides chat actions unless developer mode is enabled', () => {
    renderScreen()
    expect(screen.queryByTestId('chat-actions')).toBeNull()
  })

  it('shows chat actions in developer mode', () => {
    mockStore.preferences.developerModeEnabled = true
    renderScreen()
    expect(screen.getByTestId('chat-actions')).toBeTruthy()
  })
})
