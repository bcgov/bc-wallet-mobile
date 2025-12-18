import { render, waitFor } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import ProgressBar from '../../src/components/ProgressBar'

describe('ProgressBar Component', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} />
      </BasicAppContext>,
    )

    waitFor(() => {
      expect(tree).toMatchSnapshot()
    })
  })

  test('renders correctly in dark mode', () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} dark />
      </BasicAppContext>,
    )

    waitFor(() => {
      expect(tree).toMatchSnapshot()
    })
  })
})
