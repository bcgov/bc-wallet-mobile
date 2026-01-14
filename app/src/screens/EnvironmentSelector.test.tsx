import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import EnvironmentSelector from './EnvironmentSelector'

describe('EnvironmentSelector snapshots', () => {
  const mockOnEnvironmentChange = jest.fn().mockResolvedValue(undefined)
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EnvironmentSelector onEnvironmentChange={mockOnEnvironmentChange} onCancel={mockOnCancel} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
