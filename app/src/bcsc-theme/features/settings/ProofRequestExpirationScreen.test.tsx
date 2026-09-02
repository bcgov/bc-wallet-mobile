import { ProofRequestExpirationScreen } from '@/bcsc-theme/features/settings/ProofRequestExpirationScreen'
import { initialState } from '@/store'
import { ProofRequestExpirationTime } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

const withExpiration = (proofRequestExpirationMs?: number) => ({
  preferences: { ...initialState.preferences, proofRequestExpirationMs },
})

const renderScreen = (proofRequestExpirationMs?: number) =>
  render(
    <BasicAppContext
      initialStateOverride={proofRequestExpirationMs === undefined ? undefined : withExpiration(proofRequestExpirationMs)}
    >
      <ProofRequestExpirationScreen />
    </BasicAppContext>
  )

// BouncyCheckbox renders a tappable element labelled with the option value
const checkbox = (utils: ReturnType<typeof renderScreen>, value: number) => utils.getByLabelText(String(value))

describe('ProofRequestExpirationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('renders every expiration option', () => {
    const utils = renderScreen()

    expect(checkbox(utils, ProofRequestExpirationTime.TwoMinutes)).toBeTruthy()
    expect(checkbox(utils, ProofRequestExpirationTime.OneHour)).toBeTruthy()
    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours)).toBeTruthy()
    expect(checkbox(utils, ProofRequestExpirationTime.SevenDays)).toBeTruthy()
    expect(checkbox(utils, ProofRequestExpirationTime.Never)).toBeTruthy()
  })

  it('defaults the selection to 48 hours when no preference is stored', () => {
    const utils = renderScreen()

    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours).props.isChecked).toBe(true)
    expect(checkbox(utils, ProofRequestExpirationTime.OneHour).props.isChecked).toBe(false)
  })

  it('reflects the stored proofRequestExpirationMs preference', () => {
    const utils = renderScreen(ProofRequestExpirationTime.OneHour)

    expect(checkbox(utils, ProofRequestExpirationTime.OneHour).props.isChecked).toBe(true)
    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours).props.isChecked).toBe(false)
  })

  it('keeps "Never" (0) selected when stored, rather than falling back to the default', () => {
    const utils = renderScreen(ProofRequestExpirationTime.Never)

    expect(checkbox(utils, ProofRequestExpirationTime.Never).props.isChecked).toBe(true)
    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours).props.isChecked).toBe(false)
  })

  it('moves the selection when a different expiration is chosen', () => {
    const utils = renderScreen(ProofRequestExpirationTime.FortyEightHours)

    fireEvent.press(checkbox(utils, ProofRequestExpirationTime.SevenDays))

    expect(checkbox(utils, ProofRequestExpirationTime.SevenDays).props.isChecked).toBe(true)
    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours).props.isChecked).toBe(false)
  })

  it('can select "Never" to disable expiration', () => {
    const utils = renderScreen(ProofRequestExpirationTime.FortyEightHours)

    fireEvent.press(checkbox(utils, ProofRequestExpirationTime.Never))

    expect(checkbox(utils, ProofRequestExpirationTime.Never).props.isChecked).toBe(true)
    expect(checkbox(utils, ProofRequestExpirationTime.FortyEightHours).props.isChecked).toBe(false)
  })
})
