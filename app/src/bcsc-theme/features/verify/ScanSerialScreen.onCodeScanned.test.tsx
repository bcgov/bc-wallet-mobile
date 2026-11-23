import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  BC_BCID_BARCODE_Y,
  BC_BCSC_BARCODE_C,
  BC_COMBO_BARCODE_K,
  BC_DL_BARCODE_NO_DCN_A,
  BC_DL_BARCODE_S,
} from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { TestIds } from '@/test-ids/registry'
import { bifoldLoggerInstance, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect } from '@react-navigation/native'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Rect } from 'react-native-svg'
import ScanSerialScreen from './ScanSerialScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockHandleScanComboCard = jest.fn()
jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: () => ({
    handleScanComboCard: mockHandleScanComboCard,
  }),
}))

// Hands the screen's onCodeScanned to the test, so the real decoder runs without a camera.
const mockCamera: { onCodeScanned?: (codes: ScanableCode[]) => Promise<void | boolean>; onError?: () => void } = {}
jest.mock('../../components/CodeScanningCamera', () => ({
  __esModule: true,
  default: (props: { onCodeScanned: (codes: ScanableCode[]) => Promise<void | boolean>; onError: () => void }) => {
    mockCamera.onCodeScanned = props.onCodeScanned
    mockCamera.onError = props.onError
    return null
  },
}))

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
}))

jest.mock('../../contexts/BCSCLoadingContext', () => ({
  ...jest.requireActual('../../contexts/BCSCLoadingContext'),
  LoadingScreen: () => null,
}))

const mockUseFocusEffect = useFocusEffect as jest.Mock

const code39 = (value?: string): ScanableCode => ({ type: 'code-39', value })
const code128 = (value?: string): ScanableCode => ({ type: 'code-128', value })
const pdf417 = (value: string): ScanableCode => ({ type: 'pdf-417', value })

const serial = code39('K12345678')
const otherSerial = code128('A06198657')
const licence = pdf417(BC_DL_BARCODE_S)
// A different birth date from the S licence (1982-01-04), so a replaced card is visible in the result.
const otherLicence = pdf417(BC_DL_BARCODE_NO_DCN_A)
const damaged = pdf417(BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?'))
const unknown: ScanableCode = { type: 'unknown', value: 'UNKNOWN-VALUE-1' }

const SERIAL_BIRTH_DATE = new Date(1982, 0, 4)
const OTHER_BIRTH_DATE = new Date(1970, 8, 6)

let navigation: unknown

// The screen swaps in its help text on a 0 ms timer from mount; let it land inside act.
const settleHelpTimer = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

const renderScreen = async () => {
  const utils = render(
    <BasicAppContext>
      <ScanSerialScreen navigation={navigation as never} />
    </BasicAppContext>
  )
  await settleHelpTimer()
  return utils
}

// Mirror DECODE_FAILURE_STREAK_MS and DECODE_FAILURE_STREAK_GAP_MS in the screen.
const STREAK_MS = 5000
const GAP_MS = 1500
// How often the tests deliver a batch while failing; well inside GAP_MS.
const FRAME_MS = 500

// The screen times the failure streak with Date.now, so the tests drive the clock.
let mockNow = 0
const advance = (ms: number) => {
  mockNow += ms
}

const navigationMock = () => navigation as ReturnType<typeof useNavigation>

const scan = async (codes: ScanableCode[]): Promise<void | boolean> => {
  let result: void | boolean = undefined
  await act(async () => {
    result = await mockCamera.onCodeScanned?.(codes)
  })
  return result
}

// Scans `codes` now and then every FRAME_MS until `ms` has passed, returning each batch's result.
const failFor = async (ms: number, codes: ScanableCode[] = [damaged]) => {
  const results = [await scan(codes)]
  for (let elapsed = FRAME_MS; elapsed <= ms; elapsed += FRAME_MS) {
    advance(FRAME_MS)
    results.push(await scan(codes))
  }
  return results
}

describe('ScanSerialScreen onCodeScanned', () => {
  // The container's init() swaps in this shared logger, whatever BasicAppContext registers.
  const debugSpy = jest.spyOn(bifoldLoggerInstance, 'debug').mockImplementation(() => undefined)
  const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockNow)

  beforeEach(() => {
    navigation = useNavigation()
    jest.clearAllMocks()
    mockNow = 1_000_000
  })

  afterAll(() => {
    debugSpy.mockRestore()
    nowSpy.mockRestore()
  })

  it('skips an unknown code, then hands a complete card to handleScanComboCard', async () => {
    render(
      <BasicAppContext>
        <ScanSerialScreen navigation={useNavigation() as never} />
      </BasicAppContext>
    )
    await settleHelpTimer()

    const unknownCode: ScanableCode = { type: 'unknown', value: 'UNKNOWN-VALUE-1' }
    const serial: ScanableCode = { type: 'code-39', value: 'K12345678' }
    const licence: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S }
    const damaged: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?') }

    let firstBatch: void | boolean = undefined
    await act(async () => {
      firstBatch = await mockCamera.onCodeScanned?.([unknownCode, serial, damaged])
    })

    // The serial is captured but there is no birth date yet, so the camera keeps scanning.
    expect(firstBatch).toBe(false)
    expect(mockHandleScanComboCard).not.toHaveBeenCalled()

    let secondBatch: void | boolean = undefined
    await act(async () => {
      secondBatch = await mockCamera.onCodeScanned?.([licence])
    })

    expect(secondBatch).toBe(true)
    expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: new Date(1982, 0, 4) })

    const loggedArguments = JSON.stringify(debugSpy.mock.calls)
    for (const sensitive of [
      'UNKNOWN-VALUE-1',
      'K12345678',
      BC_DL_BARCODE_S,
      'S00023254',
      'SPECIMEN',
      'specimen',
      '2222222',
    ]) {
      expect(loggedArguments).not.toContain(sensitive)
    }
    expect(loggedArguments).toContain('"source":"1d"')
    expect(loggedArguments).toContain('"source":"pdf417"')
    expect(loggedArguments).toContain('"reason":"damaged"')
  })

  describe('completing a scan', () => {
    it('completes when the serial and the licence arrive in one batch', async () => {
      await renderScreen()

      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('completes when the licence comes before the serial in one batch', async () => {
      await renderScreen()

      expect(await scan([licence, serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('completes when the serial arrives first and the licence in a later batch', async () => {
      await renderScreen()

      expect(await scan([serial])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('completes when the licence arrives first and the serial in a later batch', async () => {
      await renderScreen()

      expect(await scan([licence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('keeps scanning on an empty batch', async () => {
      await renderScreen()

      expect(await scan([])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('keeps scanning when a combo card is seen twice without a separate 1D serial', async () => {
      await renderScreen()
      const combo = pdf417(BC_COMBO_BARCODE_K)

      expect(await scan([combo])).toBe(false)
      expect(await scan([combo])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('uses the 1D serial, not the card number in the PDF-417, whichever card it is', async () => {
      await renderScreen()

      expect(await scan([pdf417(BC_BCID_BARCODE_Y)])).toBe(false)
      expect(await scan([pdf417(BC_BCSC_BARCODE_C)])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('replaces the serial with the latest one read across batches', async () => {
      await renderScreen()

      expect(await scan([serial])).toBe(false)
      expect(await scan([otherSerial])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('A06198657', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('replaces the card with the latest one read across batches', async () => {
      await renderScreen()

      expect(await scan([otherLicence])).toBe(false)
      expect(await scan([licence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('treats a card with no card number in its security field like any other card', async () => {
      await renderScreen()

      expect(await scan([otherLicence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: OTHER_BIRTH_DATE })
    })
  })

  describe('competing reads in one batch', () => {
    it('uses the later serial when two serials arrive before the licence', async () => {
      await renderScreen()

      expect(await scan([serial, otherSerial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('A06198657', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('uses the later card when two cards arrive before the serial', async () => {
      await renderScreen()

      expect(await scan([licence, otherLicence, serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: OTHER_BIRTH_DATE })
    })

    it('decides once, after the whole batch, so later replacements win over an earlier complete pair', async () => {
      await renderScreen()

      expect(await scan([serial, licence, otherSerial, otherLicence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('A06198657', { birthDate: OTHER_BIRTH_DATE })
    })
  })

  describe('unreadable barcodes', () => {
    it.each([
      ['a damaged PDF-417', pdf417(BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?'))],
      ['an AAMVA PDF-417', pdf417('@\n\u001e\rANSI 636028090002DL00410278ZV03190008DLDAQ1234567\n')],
      ['a serial read as a PDF-417', pdf417('S00023254')],
      ['a code-39 of digits only', code39('123456789')],
      ['a code-39 with no value', code39(undefined)],
      ['a code-128 with an empty value', code128('')],
      ['a QR code', { type: 'qr-code', value: 'A12345678' } as ScanableCode],
    ])(
      'keeps scanning on %s until it has failed for the whole streak, then routes to the card scanning error',
      async (_, unreadable) => {
        await renderScreen()

        expect(await failFor(STREAK_MS - FRAME_MS, [unreadable])).not.toContain(true)
        expect(navigationMock().navigate).not.toHaveBeenCalled()

        advance(FRAME_MS)
        expect(await scan([unreadable])).toBe(true)
        expect(navigationMock().navigate).toHaveBeenCalledTimes(1)
        expect(navigationMock().navigate).toHaveBeenCalledWith(BCSCScreens.CardScanningError)
        expect(mockHandleScanComboCard).not.toHaveBeenCalled()
      }
    )

    it('does not route sooner for batches with several unreadable codes', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS - FRAME_MS, [damaged, damaged, damaged])).not.toContain(true)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
    })

    it('carries the streak across a pause no longer than the gap', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS - FRAME_MS - GAP_MS)).not.toContain(true)
      advance(GAP_MS)
      expect(await scan([damaged])).toBe(false)
      advance(FRAME_MS)
      expect(await scan([damaged])).toBe(true)
      expect(navigationMock().navigate).toHaveBeenCalledWith(BCSCScreens.CardScanningError)
    })

    it('starts a new streak after a pause longer than the gap', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS - FRAME_MS)).not.toContain(true)
      advance(GAP_MS + 1)
      expect(await failFor(STREAK_MS - FRAME_MS)).not.toContain(true)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
    })

    it('completes on a good scan just before the streak runs out', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS - FRAME_MS)).not.toContain(true)
      advance(FRAME_MS)
      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
    })

    it('reads the serial when an unreadable code comes before it in the batch', async () => {
      await renderScreen()

      expect(await scan([damaged, serial])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('stops counting failures once a barcode has decoded', async () => {
      await renderScreen()

      expect(await scan([serial, damaged])).toBe(false)
      advance(FRAME_MS)
      expect(await failFor(STREAK_MS + FRAME_MS)).not.toContain(true)
      expect(navigationMock().navigate).not.toHaveBeenCalled()

      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    it('ignores an unreadable code between the licence and the serial', async () => {
      await renderScreen()

      expect(await scan([licence])).toBe(false)
      expect(await scan([damaged])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
    })

    it('skips an unknown code with no hook call and does not count it as a failure', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS + FRAME_MS, [unknown])).not.toContain(true)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('counts an unreadable code that follows an unknown one', async () => {
      await renderScreen()

      expect(await failFor(STREAK_MS - FRAME_MS, [unknown, damaged])).not.toContain(true)
      advance(FRAME_MS)
      expect(await scan([unknown, damaged])).toBe(true)
      expect(navigationMock().navigate).toHaveBeenCalledWith(BCSCScreens.CardScanningError)
    })
  })

  describe('once a scan has finished', () => {
    it('ignores every later batch after a completed pair', async () => {
      await renderScreen()

      expect(await scan([serial, licence])).toBe(true)
      expect(await scan([damaged])).toBe(true)
      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
    })

    it('ignores every later batch after routing to the card scanning error', async () => {
      await renderScreen()

      await failFor(STREAK_MS)
      expect(await scan([serial, licence])).toBe(true)
      expect(navigationMock().navigate).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })
  })

  describe('starting over', () => {
    // While the camera has failed the screen does not render CodeScanningCamera, so the mock only
    // recaptures onCodeScanned after Try Again remounts it.
    const tryAgain = ({ getByTestId }: Awaited<ReturnType<typeof renderScreen>>) => {
      act(() => {
        mockCamera.onError?.()
      })
      fireEvent.press(getByTestId(testIdWithKey(TestIds.verify.scanSerial.retryCamera)))
    }

    it('forgets the serial on Try Again', async () => {
      const screen = await renderScreen()

      expect(await scan([serial])).toBe(false)
      tryAgain(screen)

      expect(await scan([licence])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('resets the failure streak on Try Again', async () => {
      const screen = await renderScreen()

      await failFor(STREAK_MS - FRAME_MS)
      tryAgain(screen)

      // Without the reset, the first of these would finish the streak.
      advance(FRAME_MS)
      await failFor(STREAK_MS - FRAME_MS)
      expect(navigationMock().navigate).not.toHaveBeenCalled()
    })

    it('forgets the card on Try Again', async () => {
      const screen = await renderScreen()

      expect(await scan([licence])).toBe(false)
      tryAgain(screen)

      expect(await scan([serial])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('scans again after routing to the card scanning error and Try Again', async () => {
      const screen = await renderScreen()

      await failFor(STREAK_MS)
      tryAgain(screen)

      expect(await scan([serial, licence])).toBe(true)
      expect(navigationMock().navigate).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith('K12345678', { birthDate: SERIAL_BIRTH_DATE })
    })

    describe('when the screen regains focus', () => {
      type FocusEffect = () => void | (() => void)
      const focusEffects = new Map<FocusEffect, void | (() => void)>()

      beforeEach(() => {
        focusEffects.clear()
        mockUseFocusEffect.mockImplementation((effect: FocusEffect) => {
          React.useEffect(() => {
            focusEffects.set(effect, effect())
            return () => {
              focusEffects.get(effect)?.()
              focusEffects.delete(effect)
            }
          }, [effect])
        })
      })

      afterEach(() => {
        mockUseFocusEffect.mockImplementation(() => undefined)
      })

      const refocusScreen = () =>
        act(() => {
          for (const [effect, cleanup] of Array.from(focusEffects)) {
            cleanup?.()
            focusEffects.set(effect, effect())
          }
        })

      it('forgets a partial scan', async () => {
        await renderScreen()

        expect(await scan([serial])).toBe(false)
        refocusScreen()

        expect(await scan([licence])).toBe(false)
        expect(mockHandleScanComboCard).not.toHaveBeenCalled()
      })

      it('resets the failure streak, so returning from the error screen gives a fresh streak', async () => {
        await renderScreen()

        await failFor(STREAK_MS)
        expect(navigationMock().navigate).toHaveBeenCalledTimes(1)
        refocusScreen()

        advance(FRAME_MS)
        expect(await failFor(STREAK_MS - FRAME_MS)).not.toContain(true)
        expect(navigationMock().navigate).toHaveBeenCalledTimes(1)
        advance(FRAME_MS)
        expect(await scan([damaged])).toBe(true)
        expect(navigationMock().navigate).toHaveBeenCalledTimes(2)
      })

      it('scans a new pair after a completed one', async () => {
        await renderScreen()

        expect(await scan([serial, licence])).toBe(true)
        refocusScreen()

        expect(await scan([otherSerial, otherLicence])).toBe(true)
        expect(mockHandleScanComboCard).toHaveBeenCalledTimes(2)
        expect(mockHandleScanComboCard).toHaveBeenLastCalledWith('A06198657', { birthDate: OTHER_BIRTH_DATE })
      })
    })
  })

  describe('while a hook call is still in flight', () => {
    const deferred = () => {
      let resolve: () => void = () => undefined
      const promise = new Promise<void>((res) => {
        resolve = res
      })
      return { promise, resolve }
    }

    // The framing outline turns green once the screen locks; it only renders after the container is laid out.
    const outlineColor = (screen: Awaited<ReturnType<typeof renderScreen>>) => {
      return screen.UNSAFE_getAllByType(Rect).find((rect) => rect.props.stroke)?.props.stroke
    }

    const layOut = (screen: Awaited<ReturnType<typeof renderScreen>>) => {
      const container = screen.UNSAFE_root.findAll((node) => typeof node.props.onLayout === 'function')[0]
      act(() => {
        container.props.onLayout({ nativeEvent: { layout: { width: 300, height: 500 } } })
      })
    }

    // Starts a scan without awaiting it, so the test can act while the hook call is pending.
    const startScan = (codes: ScanableCode[]) => {
      let pending: Promise<void | boolean> = Promise.resolve()
      act(() => {
        pending = mockCamera.onCodeScanned?.(codes) ?? Promise.resolve()
      })
      return pending
    }

    it('locks for a completed pair before the hook call settles', async () => {
      const screen = await renderScreen()
      layOut(screen)
      const before = outlineColor(screen)
      expect(before).not.toBe('#00FF00')
      const inFlight = deferred()
      mockHandleScanComboCard.mockReturnValueOnce(inFlight.promise)

      const first = startScan([serial, licence])

      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(outlineColor(screen)).toBe('#00FF00')
      expect(await scan([serial, licence])).toBe(true)
      expect(await scan([damaged])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(navigationMock().navigate).not.toHaveBeenCalled()

      await act(async () => {
        inFlight.resolve()
        await first
      })
      expect(await first).toBe(true)
    })
  })

  describe('logging', () => {
    it('never logs the serial, the card number, the health number or the raw barcode', async () => {
      await renderScreen()

      await scan([serial, pdf417(BC_COMBO_BARCODE_K)])

      const loggedArguments = JSON.stringify(debugSpy.mock.calls)
      for (const sensitive of ['K00023254', '9123456789', 'K12345678', BC_COMBO_BARCODE_K]) {
        expect(loggedArguments).not.toContain(sensitive)
      }
    })

    it('logs each decoded barcode with its type and source only', async () => {
      await renderScreen()

      await scan([serial, pdf417(BC_COMBO_BARCODE_K)])

      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Decoded barcode metadata:', {
        type: 'code-39',
        source: '1d',
      })
      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Decoded barcode metadata:', {
        type: 'pdf-417',
        source: 'pdf417',
      })
    })

    it('logs a failed decode with its type and reason only', async () => {
      await renderScreen()

      await scan([damaged])

      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Failed to decode barcode', {
        type: 'pdf-417',
        reason: 'damaged',
      })
    })

    it('logs that an unknown barcode was skipped, with no payload', async () => {
      await renderScreen()

      await scan([unknown])

      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Skipping unknown barcode')
    })
  })
})
