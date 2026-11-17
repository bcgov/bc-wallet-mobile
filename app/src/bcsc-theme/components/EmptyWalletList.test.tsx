import { openLink } from '@/utils/links'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { ReactTestInstance } from 'react-test-renderer'

import EmptyWalletList from './EmptyWalletList'

// EmptyWalletList sizes itself to the viewport via navigation hooks that throw
// outside their navigators; stub them since this test renders the component alone.
jest.mock('@react-navigation/elements', () => ({
  ...jest.requireActual('@react-navigation/elements'),
  useHeaderHeight: () => 0,
}))
jest.mock('@react-navigation/bottom-tabs', () => ({
  ...jest.requireActual('@react-navigation/bottom-tabs'),
  useBottomTabBarHeight: () => 0,
}))
jest.mock('@/utils/links', () => ({
  openLink: jest.fn(),
}))

describe('EmptyWalletList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the wallet illustration and localized message', () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <EmptyWalletList />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('Wallet.Empty'))).toBeTruthy()
    expect(getByTestId(testIdWithKey('Wallet.EmptyIllustration'))).toBeTruthy()
    expect(getByText('BCSC.Wallet.EmptyMessage')).toBeTruthy()
  })

  it('renders the learn-more tile and opens the learn-more URL when pressed', () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <EmptyWalletList />
      </BasicAppContext>
    )

    const learnMoreTile = getByTestId(testIdWithKey('Wallet.EmptyLearnMore'))

    expect(learnMoreTile).toBeTruthy()
    expect(getByText('BCSC.Wallet.EmptyLearnMore')).toBeTruthy()

    fireEvent.press(learnMoreTile)

    expect(openLink).toHaveBeenCalledWith('https://id.gov.bc.ca/static/help/topics.html')
  })

  describe('floating Scan button clearance', () => {
    // The jest window is 1334 tall and the header, tab bar and safe-area insets are all 0 here, so the
    // viewport is 1334; the button's footprint is 56 + 40.
    const VIEWPORT = 1334
    const CLEARANCE = 96

    const renderWithContentHeight = (contentHeight: number) => {
      const { getByTestId } = render(
        <BasicAppContext>
          <EmptyWalletList />
        </BasicAppContext>
      )
      const container = getByTestId(testIdWithKey('Wallet.Empty'))
      const content = container.children[0] as ReactTestInstance
      fireEvent(content, 'layout', { nativeEvent: { layout: { height: contentHeight } } })

      return StyleSheet.flatten(container.props.style)
    }

    it('keeps the content centred while it stays clear of the button', () => {
      const style = renderWithContentHeight(VIEWPORT - 2 * CLEARANCE)

      expect(style.minHeight).toBe(VIEWPORT)
      expect(style.paddingBottom).toBe(24)
    })

    it('leaves the button footprint free below the tile once the content reaches it', () => {
      const style = renderWithContentHeight(VIEWPORT - 2 * CLEARANCE + 1)

      expect(style.paddingBottom).toBe(24 + CLEARANCE)
    })
  })
})
