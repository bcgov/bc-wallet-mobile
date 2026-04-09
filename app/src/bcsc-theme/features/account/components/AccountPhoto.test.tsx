import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import AccountPhoto from './AccountPhoto'

describe('AccountPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly with no photo', () => {
    const tree = render(
      <BasicAppContext>
        <AccountPhoto photoUri={null} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly with a photo', () => {
    const tree = render(
      <BasicAppContext>
        <AccountPhoto photoUri="https://example.com/photo.jpg" />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
