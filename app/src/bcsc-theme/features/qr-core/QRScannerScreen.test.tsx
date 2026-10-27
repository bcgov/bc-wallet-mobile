import { BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useFocusEffect } from '@react-navigation/native'
import { act, render } from '@testing-library/react-native'
import React from 'react'

import { useAccountTransferQRCodeStrategy } from './qr-code-strategies/useAccountTransferQRCodeStrategy'
import { useDidCommOobQRCodeStrategy } from './qr-code-strategies/useDidCommOobQRCodeStrategy'
import { usePairingCodeQRCodeStrategy } from './qr-code-strategies/usePairingCodeQRCodeStrategy'
import QRScanner from './QRScanner'
import QRScannerScreen from './QRScannerScreen'

const mockNavigate = jest.fn()
const mockParentNavigate = jest.fn()

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@bifold/core', () => ({
  Screens: {},
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: () => [{ warn: jest.fn() }],
}))
jest.mock('@/contexts/ErrorAlertContext', () => {
  const emitErrorModal = jest.fn()
  return { useErrorAlert: () => ({ emitErrorModal, isErrorModalVisible: false }) }
})
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: () => ({ navigate: mockParentNavigate }),
  }),
}))
jest.mock('./QRScanner', () => jest.fn(() => null))
jest.mock('./qr-code-strategies/usePairingCodeQRCodeStrategy', () => ({ usePairingCodeQRCodeStrategy: jest.fn() }))
jest.mock('./qr-code-strategies/useAccountTransferQRCodeStrategy', () => ({
  useAccountTransferQRCodeStrategy: jest.fn(),
}))
jest.mock('./qr-code-strategies/useDidCommOobQRCodeStrategy', () => ({ useDidCommOobQRCodeStrategy: jest.fn() }))

const mockQRScanner = QRScanner as unknown as jest.Mock
const mockUseFocusEffect = useFocusEffect as jest.Mock

const latestProps = () => mockQRScanner.mock.calls.at(-1)![0]
const focus = () => act(() => (mockUseFocusEffect.mock.calls.at(-1)![0] as () => void)())

describe('QRScannerScreen', () => {
  let pairingHandle: jest.Mock
  let onPairingCodeFound: (code: string) => void
  let onTransferSuccess: () => void
  let onAlreadyVerified: () => void
  let onConnectionFound: (id: string) => void
  let onMediatorInvitation: (uri: string) => void

  beforeEach(() => {
    jest.clearAllMocks()
    pairingHandle = jest.fn().mockResolvedValue(undefined)
    ;(usePairingCodeQRCodeStrategy as jest.Mock).mockImplementation((cb) => {
      onPairingCodeFound = cb
      return { matches: (u: string) => u === 'pairing', handle: pairingHandle }
    })
    ;(useAccountTransferQRCodeStrategy as jest.Mock).mockImplementation((success, verified) => {
      onTransferSuccess = success
      onAlreadyVerified = verified
      return { matches: () => false, handle: jest.fn() }
    })
    ;(useDidCommOobQRCodeStrategy as jest.Mock).mockImplementation((cb, options) => {
      onConnectionFound = cb
      onMediatorInvitation = options.onMediatorInvitation
      return { matches: () => false, handle: jest.fn() }
    })
  })

  it('navigates to the pairing code tab when a pairing code is found', () => {
    render(<QRScannerScreen />)
    onPairingCodeFound('ABC123')
    expect(mockNavigate).toHaveBeenCalledWith(BCSCQRCoreScreens.PairingCode, { pairingCode: 'ABC123' })
  })

  it('navigates the parent stack on account transfer success and already verified', () => {
    render(<QRScannerScreen />)
    onTransferSuccess()
    onAlreadyVerified()
    expect(mockParentNavigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    expect(mockParentNavigate).toHaveBeenCalledWith(BCSCScreens.AlreadyVerifiedSuccess)
  })

  it('navigates the parent stack to the connection screen when a connection is found', () => {
    render(<QRScannerScreen />)
    onConnectionFound('oob-1')
    expect(mockParentNavigate).toHaveBeenCalledWith(BCSCScreens.ConnectionLoading, { oobRecordId: 'oob-1' })
  })

  it('navigates the parent stack to the mediator picker with a scanned mediator invitation', () => {
    render(<QRScannerScreen />)
    onMediatorInvitation('https://mediator.example/invite?oob=abc')
    expect(mockParentNavigate).toHaveBeenCalledWith(BCSCScreens.ConfigureMediator, {
      scannedMediatorUri: 'https://mediator.example/invite?oob=abc',
    })
  })

  it('releases the scan lock on refocus after a completed scan', async () => {
    render(<QRScannerScreen />)

    await act(async () => latestProps().onScan('pairing'))
    await act(async () => latestProps().onScan('pairing'))
    expect(pairingHandle).toHaveBeenCalledTimes(1) // locked after success

    focus()
    await act(async () => latestProps().onScan('pairing'))
    expect(pairingHandle).toHaveBeenCalledTimes(2)
  })

  it('does not release the lock when refocused while a scan is still running', async () => {
    let finish!: () => void
    pairingHandle.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<QRScannerScreen />)

    act(() => {
      latestProps().onScan('pairing')
    })
    focus()
    await act(async () => latestProps().onScan('pairing'))
    expect(pairingHandle).toHaveBeenCalledTimes(1)

    await act(async () => finish())
  })

  // The OOB strategy matches every http(s) URL, so it must stay after the more specific strategies.
  describe('strategy order', () => {
    const PAIRING_URL = 'https://example.com/pair#ABC123'
    const TRANSFER_URL = 'https://example.com/transfer'
    const OTHER_URL = 'https://example.com/invite'

    const mockOverlappingStrategies = () => {
      const handles = { pairing: jest.fn(), transfer: jest.fn(), oob: jest.fn() }
      ;(usePairingCodeQRCodeStrategy as jest.Mock).mockReturnValue({
        matches: (u: string) => u === PAIRING_URL,
        handle: handles.pairing,
      })
      ;(useAccountTransferQRCodeStrategy as jest.Mock).mockReturnValue({
        matches: (u: string) => u === TRANSFER_URL,
        handle: handles.transfer,
      })
      ;(useDidCommOobQRCodeStrategy as jest.Mock).mockReturnValue({
        matches: (u: string) => u.startsWith('https://'),
        handle: handles.oob,
      })
      return handles
    }

    it('routes a pairing code URL to the pairing strategy, not the OOB strategy', async () => {
      const handles = mockOverlappingStrategies()
      render(<QRScannerScreen />)

      await act(async () => latestProps().onScan(PAIRING_URL))

      expect(handles.pairing).toHaveBeenCalledWith(PAIRING_URL)
      expect(handles.oob).not.toHaveBeenCalled()
    })

    it('routes an account transfer URL to the transfer strategy, not the OOB strategy', async () => {
      const handles = mockOverlappingStrategies()
      render(<QRScannerScreen />)

      await act(async () => latestProps().onScan(TRANSFER_URL))

      expect(handles.transfer).toHaveBeenCalledWith(TRANSFER_URL)
      expect(handles.oob).not.toHaveBeenCalled()
    })

    it('routes any other URL to the OOB strategy', async () => {
      const handles = mockOverlappingStrategies()
      render(<QRScannerScreen />)

      await act(async () => latestProps().onScan(OTHER_URL))

      expect(handles.oob).toHaveBeenCalledWith(OTHER_URL)
      expect(handles.pairing).not.toHaveBeenCalled()
      expect(handles.transfer).not.toHaveBeenCalled()
    })
  })
})
