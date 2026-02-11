import { render } from '@testing-library/react-native'
import React from 'react'

import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BasicAppContext } from '@mocks/helpers/app'
import RemoveAccountConfirmationScreen from './RemoveAccountConfirmationScreen'

describe('RemoveAccountConfirmation', () => {
  beforeEach(() => {
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
          <RemoveAccountConfirmationScreen />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
