import { AutoLockScreen } from '@/bcsc-theme/features/settings/AutoLockScreen'
import { initialState } from '@/store'
import { AutoLockTime } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

const withAutoLockTime = (autoLockTime?: number) => ({
  preferences: { ...initialState.preferences, autoLockTime },
})

const renderScreen = (autoLockTime?: number) =>
  render(
    <BasicAppContext initialStateOverride={autoLockTime === undefined ? undefined : withAutoLockTime(autoLockTime)}>
      <AutoLockScreen />
    </BasicAppContext>
  )

// BouncyCheckbox renders a tappable element labelled with the option value
const checkbox = (utils: ReturnType<typeof renderScreen>, value: number) => utils.getByLabelText(String(value))

const setDev = (value: boolean) => {
  const globalWithDev = global as { __DEV__?: boolean }
  globalWithDev.__DEV__ = value
}

describe('AutoLockScreen', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    setDev(originalDev as boolean)
  })

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('renders the always-available timeout options', () => {
    const utils = renderScreen()

    expect(checkbox(utils, AutoLockTime.FiveMinutes)).toBeTruthy()
    expect(checkbox(utils, AutoLockTime.ThreeMinutes)).toBeTruthy()
    expect(checkbox(utils, AutoLockTime.OneMinute)).toBeTruthy()
  })

  it('defaults the selection to five minutes when no preference is stored', () => {
    const utils = renderScreen()

    expect(checkbox(utils, AutoLockTime.FiveMinutes).props.isChecked).toBe(true)
    expect(checkbox(utils, AutoLockTime.ThreeMinutes).props.isChecked).toBe(false)
    expect(checkbox(utils, AutoLockTime.OneMinute).props.isChecked).toBe(false)
  })

  it('reflects the stored autoLockTime preference', () => {
    const utils = renderScreen(AutoLockTime.OneMinute)

    expect(checkbox(utils, AutoLockTime.OneMinute).props.isChecked).toBe(true)
    expect(checkbox(utils, AutoLockTime.FiveMinutes).props.isChecked).toBe(false)
  })

  it('moves the selection when a different timeout is chosen', () => {
    const utils = renderScreen(AutoLockTime.FiveMinutes)

    fireEvent.press(checkbox(utils, AutoLockTime.ThreeMinutes))

    expect(checkbox(utils, AutoLockTime.ThreeMinutes).props.isChecked).toBe(true)
    expect(checkbox(utils, AutoLockTime.FiveMinutes).props.isChecked).toBe(false)
  })

  it('exposes the developer-only "Never" option when __DEV__ is true', () => {
    setDev(true)
    const utils = renderScreen()

    expect(utils.queryByLabelText(String(AutoLockTime.Never))).not.toBeNull()
  })

  it('hides the "Never" option when __DEV__ is false', () => {
    setDev(false)
    const utils = renderScreen()

    expect(utils.queryByLabelText(String(AutoLockTime.Never))).toBeNull()
  })

  it('can select the developer-only "Never" option', () => {
    setDev(true)
    const utils = renderScreen(AutoLockTime.FiveMinutes)

    fireEvent.press(checkbox(utils, AutoLockTime.Never))

    expect(checkbox(utils, AutoLockTime.Never).props.isChecked).toBe(true)
    expect(checkbox(utils, AutoLockTime.FiveMinutes).props.isChecked).toBe(false)
  })
})
