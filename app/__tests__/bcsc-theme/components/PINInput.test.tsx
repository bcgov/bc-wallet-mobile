import { render } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../../__mocks__/helpers/app'
import { PINInput } from '../../../src/bcsc-theme/components/PINInput'

describe('PINInput snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly without error', () => {
    const tree = render(
      <BasicAppContext>
        <PINInput onPINChange={jest.fn()} onPINComplete={jest.fn()} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  it('renders correctly with error message', () => {
    const tree = render(
      <BasicAppContext>
        <PINInput onPINChange={jest.fn()} onPINComplete={jest.fn()} errorMessage="Invalid PIN" />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  it('renders correctly with autoFocus enabled', () => {
    const tree = render(
      <BasicAppContext>
        <PINInput onPINChange={jest.fn()} onPINComplete={jest.fn()} autoFocus={true} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
