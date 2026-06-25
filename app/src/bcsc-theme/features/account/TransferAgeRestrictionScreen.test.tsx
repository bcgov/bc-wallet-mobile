import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import TransferAgeRestrictionScreen from './TransferAgeRestrictionScreen'

describe('TransferAgeRestrictionScreen', () => {
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferAgeRestrictionScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
