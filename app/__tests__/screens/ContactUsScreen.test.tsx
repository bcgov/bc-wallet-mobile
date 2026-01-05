import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ContactUsScreen } from '../../src/bcsc-theme/features/settings/ContactUsScreen'

describe('ContactUs', () => {
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
        <ContactUsScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
