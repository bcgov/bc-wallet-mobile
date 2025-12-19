import { render } from '@testing-library/react-native'
import React from 'react'

import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { SecureAppScreen } from '../../src/bcsc-theme/features/onboarding/SecureAppScreen'

describe('SecureApp', () => {
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
          <SecureAppScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
