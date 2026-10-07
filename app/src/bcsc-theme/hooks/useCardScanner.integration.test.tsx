import BCSCApiClient from '@/bcsc-theme/api/client'
import { ClientErrorHandlingPolicies } from '@/bcsc-theme/api/clientErrorPolicies'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import useAuthorizationApi from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { DeviceAuthorizationError } from '@/bcsc-theme/features/verify/deviceAuthorizationError'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BC_COMBO_BARCODE_K } from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { decodeCardBarcode, toDriversLicenseMetadata } from '@/bcsc-theme/utils/card-barcode-decoder'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { AccountSetupType } from '@/store'
import * as Bifold from '@bifold/core'
import * as navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { Linking } from 'react-native'
import { BCSCCardProcess, getAccount } from 'react-native-bcsc-core'

// The chain under test runs for real: decoded fixture, payload builder, authorization api, a real
// BCSCApiClient (adapter stubbed) with the real global error policies wired the way BCSCApiClientContext
// wires them, IAS error mapping, device authorization recovery, authorization service and the scan handler.
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('@/hooks/useAlerts', () => {
  const alerts = new Proxy(
    {},
    { get: (target: Record<string, jest.Mock>, name: string) => (target[name] ??= jest.fn()) }
  )
  return { useAlerts: () => alerts, mockAlerts: alerts }
})
jest.mock('@/bcsc-theme/services/hooks/useRegistrationService', () => ({
  useRegistrationService: () => ({ cycleRegistration: mockCycleRegistration }),
}))
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: jest.fn(), getCurrentRoute: jest.fn() },
}))
jest.mock('@react-navigation/native')
jest.mock('@bifold/core')

const mockCycleRegistration = jest.fn()

const { mockAlerts } = jest.requireMock('@/hooks/useAlerts') as { mockAlerts: Record<string, jest.Mock> }

const CLIENT_ID = 'client-123'
const SERIAL = 'K12345678'
const DEVICE_AUTHORIZATION = {
  device_code: 'test-device-code',
  user_code: 'ABCD1234',
  verified_email: 'test@example.com',
  expires_in: 3600,
  verification_options: 'video_call back_check',
  process: 'IDIM L3 Remote BCSC Photo Identity Verification',
}

const decodedCard = () => {
  const decoded = decodeCardBarcode({ type: 'pdf-417', value: BC_COMBO_BARCODE_K })
  if (decoded.source !== 'pdf417') {
    throw new Error('fixture did not decode')
  }
  return toDriversLicenseMetadata(decoded.card)
}

describe('useCardScanner against the real client chain', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const secure = {
    updateUserInfo: jest.fn(),
    updateDeviceCodes: jest.fn(),
    updateCardProcess: jest.fn(),
    updateVerificationOptions: jest.fn(),
  }
  const nav = { navigate: jest.fn(), reset: jest.fn(), dispatch: jest.fn() }
  const adapter = jest.fn()
  const requests: { url?: string; body: any }[] = []

  // The barcodes call sends JSON; the manual-entry call sends a form body, kept as the raw string.
  const parseBody = (data?: string) => {
    try {
      return data ? JSON.parse(data) : undefined
    } catch {
      return data
    }
  }

  const responder = (status: number, data: object) => (config: any) => {
    requests.push({ url: config.url, body: parseBody(config.data) })
    const response = { status, data, statusText: String(status), headers: {} as any, config }
    return status < 400
      ? Promise.resolve(response)
      : Promise.reject(new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response))
  }

  const respondWith = (status: number, data: object) => adapter.mockImplementation(responder(status, data))

  const iasErrorBody = (error: string, description = 'A human-readable description that never names the code') => ({
    error,
    error_description: description,
  })

  const rejectWithIasError = (status: number, error: string) => respondWith(status, iasErrorBody(error))

  const setup = () => {
    const client = new BCSCApiClient('https://example.com', logger as any)
    client.client.defaults.adapter = adapter
    // The same policy runner BCSCApiClientContext installs. The resume route is where an unauthorized
    // device would land, which is never the scan screen.
    client.setErrorHandler((error, context) => {
      const policy = ClientErrorHandlingPolicies.find((candidate) => candidate.matches(error, context))
      if (!policy) {
        return
      }
      try {
        policy.handle(error, {
          linking: Linking,
          navigation: nav as any,
          translate: ((key: string) => key) as any,
          logger: logger as any,
          alerts: mockAlerts as any,
          getResumeRoute: () => ({ name: BCSCScreens.IdentitySelection }) as any,
        })
      } finally {
        error.handled = true
      }
    })
    jest.mocked(useApi).mockImplementation(() => ({ authorization: useAuthorizationApi(client) }) as any)

    return renderHook(() => ({ scanner: useCardScanner(), service: useAuthorizationService() })).result
  }

  beforeEach(() => {
    jest.clearAllMocks()
    requests.length = 0
    Object.values(secure).forEach((fn) => fn.mockResolvedValue(undefined))
    jest.mocked(getAccount).mockResolvedValue({ clientID: CLIENT_ID } as any)
    jest.mocked(useSecureActions).mockReturnValue(secure as any)
    jest.mocked(Bifold).useServices.mockReturnValue([logger as any])
    jest
      .mocked(Bifold)
      .useStore.mockReturnValue([
        { bcsc: { accountSetupType: AccountSetupType.AddAccount }, bcscSecure: { additionalEvidenceData: [] } } as any,
        jest.fn(),
      ])
    jest.mocked(navigation).useRoute.mockReturnValue({ name: BCSCScreens.ScanSerial } as any)
    jest.mocked(navigation).useNavigation = jest.fn().mockReturnValue(nav)
    jest.mocked(navigationRef.isReady).mockReturnValue(true)
    jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: BCSCScreens.ScanSerial } as any)
    // Navigating changes the current route, as it does for the real container.
    nav.navigate.mockImplementation((name: string) => {
      jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name } as any)
    })
    // The global policies move the user with dispatch(CommonActions.reset(...)).
    nav.dispatch.mockImplementation((action: { payload?: { routes?: { name: string }[] } }) => {
      const target = action.payload?.routes?.[0]?.name
      if (target) {
        jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: target } as any)
      }
    })
    nav.reset.mockImplementation(({ routes }: { routes: { name: string }[] }) => {
      jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: routes[0].name } as any)
    })
  })

  it('posts both barcodes as JSON to /device/barcodes and saves only after a match', async () => {
    respondWith(200, DEVICE_AUTHORIZATION)
    const result = setup()

    const left = await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    expect(left).toBe(true)
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe(`https://example.com/device/barcodes/${CLIENT_ID}`)
    expect(requests[0].body.barcodes).toEqual([
      expect.objectContaining({ type: 'PDF_417', iso_iin: '636028', document_number: '2222222' }),
      { type: 'CODE_128', value: SERIAL },
    ])
    expect(secure.updateUserInfo).toHaveBeenCalledWith({ serial: SERIAL, birthdate: decodedCard().birthDate })
    expect(adapter.mock.invocationCallOrder[0]).toBeLessThan(secure.updateUserInfo.mock.invocationCallOrder[0])
    expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
  })

  it('never sends the health number or the raw barcode', async () => {
    respondWith(200, DEVICE_AUTHORIZATION)
    const result = setup()

    await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    const sent = JSON.stringify(requests[0].body)
    expect(sent).not.toContain('9123456789')
    expect(sent).not.toContain(BC_COMBO_BARCODE_K)
  })

  it('continues the other-ID flow on card_not_found with no save and no alert', async () => {
    rejectWithIasError(400, 'card_not_found')
    const result = setup()

    const left = await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    expect(left).toBe(true)
    expect(secure.updateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
    expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
    expect(secure.updateUserInfo).not.toHaveBeenCalled()
    expect(secure.updateDeviceCodes).not.toHaveBeenCalled()
    Object.values(mockAlerts).forEach((alert) => expect(alert).not.toHaveBeenCalled())
  })

  it('routes card_expired to the card error screen with the scanned card', async () => {
    rejectWithIasError(400, 'card_expired')
    const result = setup()

    const left = await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    expect(left).toBe(true)
    expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationCardError, {
      errorType: DeviceAuthorizationError.CardExpired,
      scannedCard: { serial: SERIAL, birthdate: '1982-01-04' },
    })
    expect(secure.updateUserInfo).not.toHaveBeenCalled()
  })

  it('raises the server error alert and leaves the user on the screen, to try again, on a 500', async () => {
    rejectWithIasError(500, 'server_error')
    const result = setup()

    const left = await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    expect(left).toBe(false)
    expect(mockAlerts.serverErrorAlert).toHaveBeenCalledTimes(1)
    expect(nav.navigate).not.toHaveBeenCalled()
    expect(nav.reset).not.toHaveBeenCalled()
    expect(secure.updateUserInfo).not.toHaveBeenCalled()
  })

  it('cycles the registration and retries, without resetting the route, when the client is already registered', async () => {
    adapter.mockImplementationOnce(
      responder(400, iasErrorBody('invalid_registration_request', 'client is in invalid state'))
    )
    adapter.mockImplementation(responder(200, DEVICE_AUTHORIZATION))
    const result = setup()

    const left = await result.current.scanner.handleScanComboCard(SERIAL, decodedCard())

    expect(left).toBe(true)
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(2)
    expect(mockAlerts.invalidRegistrationRequestAlert).toHaveBeenCalledTimes(1)
    // The only reset is the one into setup after the retry matched, never one to the resume route.
    expect(nav.reset).toHaveBeenCalledTimes(1)
    expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: BCSCScreens.VerificationMethodSelection }] })
    expect(nav.reset.mock.invocationCallOrder[0]).toBeGreaterThan(adapter.mock.invocationCallOrder[1])
    expect(nav.dispatch).not.toHaveBeenCalled()
  })

  describe('an answer that arrives after a newer scan', () => {
    const OTHER_SERIAL = 'A06198657'

    // The first request waits until `answer` is called; later requests respond at once.
    const deferFirstRequest = (status: number, data: object, laterStatus: number, laterData: object) => {
      let answer: () => void = () => undefined
      adapter.mockImplementationOnce((config: any) => {
        const respond = responder(status, data)
        return new Promise((resolve, reject) => {
          answer = () => respond(config).then(resolve, reject)
        })
      })
      adapter.mockImplementation(responder(laterStatus, laterData))
      return { answer: () => answer() }
    }

    it('does not let a late card_not_found overwrite the card process or navigation of a newer match', async () => {
      const first = deferFirstRequest(400, iasErrorBody('card_not_found'), 200, DEVICE_AUTHORIZATION)
      const result = setup()
      let generation = 1
      const isCurrentA = () => generation === 1

      const scanA = result.current.scanner.handleScanComboCard(SERIAL, decodedCard(), isCurrentA)
      // The person leaves and returns, then scans a card that matches.
      generation = 2
      const scanB = await result.current.scanner.handleScanComboCard(
        OTHER_SERIAL,
        decodedCard(),
        () => generation === 2
      )
      expect(scanB).toBe(true)
      expect(secure.updateCardProcess).toHaveBeenCalledWith(DEVICE_AUTHORIZATION.process)
      expect(nav.reset).toHaveBeenCalledTimes(1)

      first.answer()
      const left = await scanA

      expect(left).toBe(true)
      expect(secure.updateCardProcess).not.toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
      expect(secure.updateCardProcess).toHaveBeenCalledTimes(1)
      expect(nav.navigate).not.toHaveBeenCalledWith(BCSCScreens.DualIdentificationRequired)
      expect(nav.reset).toHaveBeenCalledTimes(1)
    })

    it('does not save a late match for a scan that was superseded', async () => {
      const first = deferFirstRequest(200, DEVICE_AUTHORIZATION, 400, iasErrorBody('card_not_found'))
      const result = setup()
      let generation = 1

      const scanA = result.current.scanner.handleScanComboCard(SERIAL, decodedCard(), () => generation === 1)
      generation = 2
      await result.current.scanner.handleScanComboCard(OTHER_SERIAL, decodedCard(), () => generation === 2)
      first.answer()
      await scanA

      expect(secure.updateUserInfo).not.toHaveBeenCalled()
      expect(nav.reset).not.toHaveBeenCalled()
    })

    it('does not route a late error for a scan that was superseded', async () => {
      const first = deferFirstRequest(400, iasErrorBody('card_expired'), 400, iasErrorBody('card_not_found'))
      const result = setup()
      let generation = 1

      const scanA = result.current.scanner.handleScanComboCard(SERIAL, decodedCard(), () => generation === 1)
      generation = 2
      await result.current.scanner.handleScanComboCard(OTHER_SERIAL, decodedCard(), () => generation === 2)
      nav.navigate.mockClear()
      first.answer()
      await scanA

      expect(nav.navigate).not.toHaveBeenCalled()
    })
  })

  it('still sends a manually entered serial that gets card_not_found to the card error screen', async () => {
    rejectWithIasError(400, 'card_not_found')
    const result = setup()

    await expect(result.current.service.authorizeDevice(SERIAL, new Date(1982, 0, 4))).rejects.toBeDefined()

    expect(nav.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationCardError, {
      errorType: DeviceAuthorizationError.MismatchedSerial,
    })
  })
})
