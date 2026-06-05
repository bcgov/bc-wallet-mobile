import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'

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

describe('EmptyWalletList', () => {
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
})
