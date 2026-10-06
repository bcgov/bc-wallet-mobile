import { initialState } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import { useRoute } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import VerificationCardErrorScreen from './VerificationCardErrorScreen'
import { DeviceAuthorizationError } from './deviceAuthorizationError'

describe('VerificationCardErrorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders MismatchedSerial variant correctly', () => {
    jest.mocked(useRoute).mockReturnValue({
      key: 'test',
      name: 'BCSCVerificationCardError',
      params: { errorType: DeviceAuthorizationError.MismatchedSerial },
    })

    const tree = render(
      <BasicAppContext>
        <VerificationCardErrorScreen navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders CardExpired variant correctly', () => {
    jest.mocked(useRoute).mockReturnValue({
      key: 'test',
      name: 'BCSCVerificationCardError',
      params: { errorType: DeviceAuthorizationError.CardExpired },
    })

    const tree = render(
      <BasicAppContext>
        <VerificationCardErrorScreen navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  describe('the submitted card details', () => {
    // The shared react-i18next mock returns keys; this block needs the interpolated values and a real locale.
    beforeEach(() => {
      const strings: Record<string, (values: Record<string, string>) => string> = {
        'BCSC.LocaleStringFormat': () => 'en-US',
        'BCSC.MismatchedSerial.SerialNumber': ({ serial }) => `Serial number: ${serial}`,
        'BCSC.MismatchedSerial.Birthdate': ({ birthdate }) => `Birthdate: ${birthdate}`,
      }
      jest.spyOn(jest.requireActual('react-i18next'), 'useTranslation').mockReturnValue({
        t: (key: string, values: Record<string, string> = {}) => strings[key]?.(values) ?? key,
      } as any)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    const storeWith = (serial: string | undefined, birthdate: Date | undefined) => ({
      bcscSecure: { ...initialState.bcscSecure, serial, birthdate },
    })

    const renderMismatched = (params: object, store: ReturnType<typeof storeWith>) => {
      jest.mocked(useRoute).mockReturnValue({
        key: 'test',
        name: 'BCSCVerificationCardError',
        params: { errorType: DeviceAuthorizationError.MismatchedSerial, ...params },
      })

      return render(
        <BasicAppContext initialStateOverride={store}>
          <VerificationCardErrorScreen navigation={jest.fn() as any} />
        </BasicAppContext>
      )
    }

    const scannedCard = { serial: 'S00023254', birthdate: '1995-12-17' }

    it('shows the scanned values when the store is empty', () => {
      const tree = renderMismatched({ scannedCard }, storeWith(undefined, undefined))

      expect(tree.getByText('Serial number: S00023254')).toBeTruthy()
      expect(tree.getByText('Birthdate: December 17, 1995')).toBeTruthy()
    })

    it('shows the scanned values rather than stale store values', () => {
      const tree = renderMismatched({ scannedCard }, storeWith('A99999999', new Date(1980, 0, 1)))

      expect(tree.getByText('Serial number: S00023254')).toBeTruthy()
      expect(tree.getByText('Birthdate: December 17, 1995')).toBeTruthy()
      expect(tree.queryByText(/A99999999/)).toBeNull()
    })

    it('shows the store values when no scanned card is passed (manual entry)', () => {
      const tree = renderMismatched({}, storeWith('A99999999', new Date(1980, 0, 1)))

      expect(tree.getByText('Serial number: A99999999')).toBeTruthy()
      expect(tree.getByText('Birthdate: January 1, 1980')).toBeTruthy()
    })
  })
})
