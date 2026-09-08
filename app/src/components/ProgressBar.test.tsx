import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet, View } from 'react-native'
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

  test('supports screen-specific colors', () => {
    const tree = render(<ProgressBar progressPercent={0} trackColor="#FAF9F8" progressColor="#F8BA47" />)
    const [track, fill] = tree.UNSAFE_getAllByType(View)

    expect(StyleSheet.flatten(track.props.style)).toMatchObject({ height: 11, backgroundColor: '#FAF9F8' })
    expect(StyleSheet.flatten(fill.props.style)).toMatchObject({ backgroundColor: '#F8BA47' })
  })
})
