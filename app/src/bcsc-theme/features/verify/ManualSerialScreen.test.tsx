import { render } from '@testing-library/react-native'
import React from 'react'

import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import ManualSerialScreen from './ManualSerialScreen'

describe('ManualSerial', () => {
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
        <ErrorAlertProvider>
          <ManualSerialScreen navigation={mockNavigation as never} />
        </ErrorAlertProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
