import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import ScanSerialScreen from './ScanSerialScreen'

describe('ScanSerial', () => {
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
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
