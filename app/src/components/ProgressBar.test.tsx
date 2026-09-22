import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import ProgressBar from './ProgressBar'

describe('ProgressBar Component', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  test('renders correctly', async () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree).toMatchSnapshot()
    })
  })

  test('renders correctly in dark mode', async () => {
    const tree = render(
      <BasicAppContext>
        <ProgressBar progressPercent={0} dark />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree).toMatchSnapshot()
    })
  })
})
