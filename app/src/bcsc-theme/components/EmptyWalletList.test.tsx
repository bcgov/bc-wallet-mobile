import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'

import EmptyWalletList from './EmptyWalletList'

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
