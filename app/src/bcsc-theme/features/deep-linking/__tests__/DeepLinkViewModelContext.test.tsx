import { render, screen } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { DeepLinkViewModel } from '../DeepLinkViewModel'
import { DeepLinkViewModelProvider, useDeepLinkViewModel } from '../DeepLinkViewModelContext'

describe('DeepLinkViewModelContext', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  const createViewModel = () =>
    new DeepLinkViewModel(
      { subscribe: jest.fn(), init: jest.fn() } as any,
      {
        info: jest.fn(),
        warn: jest.fn(),
      } as any
    )

  it('throws when hook used outside provider', () => {
    const Consumer: React.FC = () => {
      useDeepLinkViewModel()
      return null
    }

    expect(() => render(<Consumer />)).toThrow('useDeepLinkViewModel must be used within a DeepLinkViewModelProvider')
  })

  it('provides the view model instance to children', () => {
    const vm = createViewModel()

    const Probe: React.FC = () => {
      const resolved = useDeepLinkViewModel()
      return <Text testID="probe">{resolved === vm ? 'ok' : 'fail'}</Text>
    }

    render(
      <DeepLinkViewModelProvider viewModel={vm}>
        <Probe />
      </DeepLinkViewModelProvider>
    )

    expect(screen.getByTestId('probe').props.children).toBe('ok')
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })
})
