import { BasicAppContext } from '@mocks/helpers/app'
import { BottomTabHeaderProps } from '@react-navigation/bottom-tabs'
import { StackHeaderProps, StackNavigationOptions } from '@react-navigation/stack'
import { render, screen } from '@testing-library/react-native'
import React from 'react'
import { Animated } from 'react-native'
import { createStackHeader, createTabHeader } from './NavigationHeaders'

const ROUTE_NAME = 'Settings'

// The minimum a header needs to render outside a navigator.
const headerProps = (options: StackNavigationOptions): StackHeaderProps =>
  ({
    layout: { width: 400, height: 800 },
    options,
    route: { key: `${ROUTE_NAME}-key`, name: ROUTE_NAME },
    navigation: { isFocused: () => true, canGoBack: () => false, dispatch: jest.fn() },
    progress: { current: new Animated.Value(1) },
    styleInterpolator: () => ({}),
  }) as unknown as StackHeaderProps

const renderHeader = (header: React.ReactElement) => render(<BasicAppContext>{header}</BasicAppContext>)

describe('NavigationHeaders', () => {
  describe.each([
    ['createStackHeader', (options: StackNavigationOptions) => createStackHeader(headerProps(options))],
    [
      'createTabHeader',
      (options: StackNavigationOptions) => createTabHeader(headerProps(options) as unknown as BottomTabHeaderProps),
    ],
  ])('%s', (_name, createHeader) => {
    it('shows the title', () => {
      renderHeader(createHeader({ title: 'My settings' }))

      expect(screen.getByRole('header', { name: 'My settings' })).toBeTruthy()
    })

    it('falls back to the route name when there is no title', () => {
      renderHeader(createHeader({}))

      expect(screen.getByRole('header', { name: ROUTE_NAME })).toBeTruthy()
    })

    // A blank title used to mount an empty header Text that VoiceOver stopped on.
    it('renders no title element for a blank title', () => {
      renderHeader(createHeader({ title: '' }))

      expect(screen.queryByRole('header')).toBeNull()
    })
  })
})
