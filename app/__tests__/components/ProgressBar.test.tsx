import { render } from '@testing-library/react-native'
import React from 'react'

import ProgressBar from '../../src/components/ProgressBar'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('ProgressBar Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('renders correctly in dark mode', () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} dark />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
