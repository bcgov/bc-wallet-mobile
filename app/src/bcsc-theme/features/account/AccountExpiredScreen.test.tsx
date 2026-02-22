import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { AccountExpiredScreen } from './AccountExpiredScreen'

jest.unmock('@/bcsc-theme/contexts/BCSCAccountContext')

describe('AccountExpired', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()

    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <BCSCAccountContext.Provider
            value={{
              isLoadingAccount: false,
              account: {
                card_expiry: '2024-12-31',
                fullname_formatted: 'John Doe',
              } as any,
            }}
          >
            <AccountExpiredScreen navigation={mockNavigation} />
          </BCSCAccountContext.Provider>
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
