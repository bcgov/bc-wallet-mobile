import { render } from '@testing-library/react-native'
import React from 'react'

import { LockoutScreen } from '@/bcsc-theme/features/auth/LockoutScreen'
import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import * as BcscCore from 'react-native-bcsc-core'

describe('LockoutScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Mock isAccountLocked to return locked state with remaining time
    jest.spyOn(BcscCore, 'isAccountLocked').mockResolvedValue({
      locked: true,
      remainingTime: 30, // 30 seconds
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <LockoutScreen navigation={mockNavigation as never} />
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
