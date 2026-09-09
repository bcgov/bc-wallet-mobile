import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Animated } from 'react-native'
import ProgressBar from './ProgressBar'

describe('ProgressBar Component', () => {
  test('stops its animation while inactive and does not start for hidden progress updates', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start, stop, reset: jest.fn() })
    try {
      const view = render(<ProgressBar progressPercent={25} />)
      expect(start).toHaveBeenCalledTimes(1)
      view.rerender(<ProgressBar progressPercent={50} active={false} />)
      expect(stop).toHaveBeenCalledTimes(1)
      expect(start).toHaveBeenCalledTimes(1)
      view.rerender(<ProgressBar progressPercent={75} active={false} />)
      expect(start).toHaveBeenCalledTimes(1)
      view.rerender(<ProgressBar progressPercent={75} />)
      expect(start).toHaveBeenCalledTimes(2)
      view.unmount()
      expect(stop).toHaveBeenCalledTimes(2)
    } finally {
      timing.mockRestore()
    }
  })
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
