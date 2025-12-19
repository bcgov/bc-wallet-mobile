import { render } from '@testing-library/react-native'
import React from 'react'

import { AutoLockScreen } from '@/bcsc-theme/features/settings/AutoLockScreen'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('AutoLockScreen', () => {
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
        <AutoLockScreen />
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
