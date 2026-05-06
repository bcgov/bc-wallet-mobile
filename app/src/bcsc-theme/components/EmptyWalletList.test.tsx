import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'

import EmptyWalletList from './EmptyWalletList'

describe('EmptyWalletList', () => {
  it('renders the empty wallet container with localized message', () => {
    const { getByTestId, getByText } = render(
      <BasicAppContext>
        <EmptyWalletList />
      </BasicAppContext>
    )

    expect(getByTestId(testIdWithKey('Wallet.Empty'))).toBeTruthy()
    expect(getByText('BCSC.Wallet.EmptyMessage')).toBeTruthy()
  })
})
