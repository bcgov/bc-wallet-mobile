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

const mockHandleScanNonBcsc = jest.fn()
const mockHandleScanComboCard = jest.fn()
jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: () => ({
    handleScanNonBcsc: mockHandleScanNonBcsc,
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

const renderScreen = () =>
  render(
    <BasicAppContext>
      <ScanSerialScreen navigation={navigation as never} />
    </BasicAppContext>
  )

const scan = async (codes: ScanableCode[]): Promise<void | boolean> => {
  let result: void | boolean = undefined
  await act(async () => {
    result = await mockCamera.onCodeScanned?.(codes)
  })
  return result
}

// Starts a scan whose handler stays pending, and returns the `isCurrent` check the screen gave it.
const startPendingScan = (codes: ScanableCode[]) => {
  mockHandleScanComboCard.mockReturnValueOnce(new Promise<boolean>(() => undefined))
  act(() => {
    void mockCamera.onCodeScanned?.(codes)
  })
  const isCurrent: () => boolean = mockHandleScanComboCard.mock.calls.at(-1)?.[2]
  return isCurrent
}

describe('ScanSerialScreen onCodeScanned', () => {
  // The container's init() swaps in this shared logger, whatever BasicAppContext registers.
  const debugSpy = jest.spyOn(bifoldLoggerInstance, 'debug').mockImplementation(() => undefined)

  beforeEach(() => {
    navigation = useNavigation()
    jest.clearAllMocks()
  })

  afterAll(() => {
    debugSpy.mockRestore()
  })

  it('skips an unknown code without a non-BCSC reroute, then hands a complete card to handleScanComboCard', async () => {
    render(
      <BasicAppContext>
        <ScanSerialScreen navigation={useNavigation() as never} />
      </BasicAppContext>
    )

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
    expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    expect(mockHandleScanComboCard).not.toHaveBeenCalled()

    let secondBatch: void | boolean = undefined
    await act(async () => {
      secondBatch = await mockCamera.onCodeScanned?.([licence])
    })

    expect(secondBatch).toBe(true)
    expect(mockHandleScanComboCard).toHaveBeenCalledWith(
      'K12345678',
      expect.objectContaining({ birthDate: new Date(1982, 0, 4) }),
      expect.any(Function)
    )
    expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()

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
      renderScreen()

      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('completes when the licence comes before the serial in one batch', async () => {
      renderScreen()

      expect(await scan([licence, serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    })

    it('completes when the serial arrives first and the licence in a later batch', async () => {
      renderScreen()

      expect(await scan([serial])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('completes when the licence arrives first and the serial in a later batch', async () => {
      renderScreen()

      expect(await scan([licence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('keeps scanning on an empty batch', async () => {
      renderScreen()

      expect(await scan([])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    })

    it('keeps scanning when a combo card is seen twice without a separate 1D serial', async () => {
      renderScreen()
      const combo = pdf417(BC_COMBO_BARCODE_K)

      expect(await scan([combo])).toBe(false)
      expect(await scan([combo])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    })

    it('uses the 1D serial, not the card number in the PDF-417, whichever card it is', async () => {
      renderScreen()

      expect(await scan([pdf417(BC_BCID_BARCODE_Y)])).toBe(false)
      expect(await scan([pdf417(BC_BCSC_BARCODE_C)])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('replaces the serial with the latest one read across batches', async () => {
      renderScreen()

      expect(await scan([serial])).toBe(false)
      expect(await scan([otherSerial])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'A06198657',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('replaces the card with the latest one read across batches', async () => {
      renderScreen()

      expect(await scan([otherLicence])).toBe(false)
      expect(await scan([licence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('treats a card with no card number in its security field like any other card', async () => {
      renderScreen()

      expect(await scan([otherLicence])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: OTHER_BIRTH_DATE }),
        expect.any(Function)
      )
    })
  })

  describe('competing reads in one batch', () => {
    it('uses the later serial when two serials arrive before the licence', async () => {
      renderScreen()

      expect(await scan([serial, otherSerial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'A06198657',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('uses the later card when two cards arrive before the serial', async () => {
      renderScreen()

      expect(await scan([licence, otherLicence, serial])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: OTHER_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('decides once, after the whole batch, so later replacements win over an earlier complete pair', async () => {
      renderScreen()

      expect(await scan([serial, licence, otherSerial, otherLicence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'A06198657',
        expect.objectContaining({ birthDate: OTHER_BIRTH_DATE }),
        expect.any(Function)
      )
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
    ])('hands %s read first to the non-BCSC flow', async (_, unreadable) => {
      renderScreen()

      expect(await scan([unreadable])).toBe(true)
      expect(mockHandleScanNonBcsc).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('hands the card to the non-BCSC flow when an unreadable code comes before the serial, and never reads the serial', async () => {
      renderScreen()

      expect(await scan([damaged, serial])).toBe(true)
      expect(mockHandleScanNonBcsc).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('ignores an unreadable code that comes after the serial, then completes on the licence', async () => {
      renderScreen()

      expect(await scan([serial, damaged])).toBe(false)
      expect(await scan([licence])).toBe(true)
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
    })

    it('ignores an unreadable code between the licence and the serial', async () => {
      renderScreen()

      expect(await scan([licence])).toBe(false)
      expect(await scan([damaged])).toBe(false)
      expect(await scan([serial])).toBe(true)
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
    })

    it('skips an unknown code with no hook call', async () => {
      renderScreen()

      expect(await scan([unknown])).toBe(false)
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('hands the card to the non-BCSC flow when an unreadable code follows an unknown one', async () => {
      renderScreen()

      expect(await scan([unknown, damaged])).toBe(true)
      expect(mockHandleScanNonBcsc).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })
  })

  describe('once a scan has finished', () => {
    it('ignores every later batch after a completed pair', async () => {
      renderScreen()

      expect(await scan([serial, licence])).toBe(true)
      expect(await scan([damaged])).toBe(true)
      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    })

    it('ignores every later batch after a non-BCSC reroute', async () => {
      renderScreen()

      expect(await scan([damaged])).toBe(true)
      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanNonBcsc).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })
  })

  describe('starting over', () => {
    // While the camera has failed the screen does not render CodeScanningCamera, so the mock only
    // recaptures onCodeScanned after Try Again remounts it.
    const tryAgain = ({ getByTestId }: ReturnType<typeof renderScreen>) => {
      act(() => {
        mockCamera.onError?.()
      })
      fireEvent.press(getByTestId(testIdWithKey(TestIds.verify.scanSerial.retryCamera)))
    }

    it('forgets the serial on Try Again', async () => {
      const screen = renderScreen()

      expect(await scan([serial])).toBe(false)
      tryAgain(screen)

      expect(await scan([licence])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('forgets the card on Try Again', async () => {
      const screen = renderScreen()

      expect(await scan([licence])).toBe(false)
      tryAgain(screen)

      expect(await scan([serial])).toBe(false)
      expect(mockHandleScanComboCard).not.toHaveBeenCalled()
    })

    it('marks a pending scan stale once Try Again is pressed', () => {
      const screen = renderScreen()
      const isCurrent = startPendingScan([serial, licence])
      expect(isCurrent()).toBe(true)

      tryAgain(screen)

      expect(isCurrent()).toBe(false)
    })

    it('marks a pending scan stale once a newer scan has started', () => {
      const screen = renderScreen()
      const earlier = startPendingScan([serial, licence])
      tryAgain(screen)

      const newer = startPendingScan([otherSerial, otherLicence])

      expect(earlier()).toBe(false)
      expect(newer()).toBe(true)
    })

    it('scans again after a non-BCSC reroute and Try Again', async () => {
      const screen = renderScreen()

      expect(await scan([damaged])).toBe(true)
      tryAgain(screen)

      expect(await scan([serial, licence])).toBe(true)
      expect(mockHandleScanNonBcsc).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledTimes(1)
      expect(mockHandleScanComboCard).toHaveBeenCalledWith(
        'K12345678',
        expect.objectContaining({ birthDate: SERIAL_BIRTH_DATE }),
        expect.any(Function)
      )
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

      it('marks a pending scan stale once the screen loses and regains focus', () => {
        renderScreen()
        const isCurrent = startPendingScan([serial, licence])
        expect(isCurrent()).toBe(true)

        refocusScreen()

        expect(isCurrent()).toBe(false)
      })

      it('forgets a partial scan', async () => {
        renderScreen()

        expect(await scan([serial])).toBe(false)
        refocusScreen()

        expect(await scan([licence])).toBe(false)
        expect(mockHandleScanComboCard).not.toHaveBeenCalled()
      })

      it('scans a new pair after a completed one', async () => {
        renderScreen()

        expect(await scan([serial, licence])).toBe(true)
        refocusScreen()

        expect(await scan([otherSerial, otherLicence])).toBe(true)
        expect(mockHandleScanComboCard).toHaveBeenCalledTimes(2)
        expect(mockHandleScanComboCard).toHaveBeenLastCalledWith(
          'A06198657',
          expect.objectContaining({ birthDate: OTHER_BIRTH_DATE }),
          expect.any(Function)
        )
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
    const outlineColor = (screen: ReturnType<typeof renderScreen>) => {
      return screen.UNSAFE_getAllByType(Rect).find((rect) => rect.props.stroke)?.props.stroke
    }

    const layOut = (screen: ReturnType<typeof renderScreen>) => {
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

    it.each([
      ['a completed pair', [serial, licence], mockHandleScanComboCard],
      ['a non-BCSC reroute', [damaged], mockHandleScanNonBcsc],
    ])('locks for %s before the hook call settles', async (_, codes, hook) => {
      const screen = renderScreen()
      layOut(screen)
      const before = outlineColor(screen)
      expect(before).not.toBe('#00FF00')
      const inFlight = deferred()
      hook.mockReturnValueOnce(inFlight.promise)

      const first = startScan(codes)

      expect(hook).toHaveBeenCalledTimes(1)
      expect(outlineColor(screen)).toBe('#00FF00')
      expect(await scan([serial, licence])).toBe(true)
      expect(await scan([damaged])).toBe(true)
      expect(mockHandleScanComboCard.mock.calls.length + mockHandleScanNonBcsc.mock.calls.length).toBe(1)

      await act(async () => {
        inFlight.resolve()
        await first
      })
      expect(await first).toBe(true)
    })
  })

  describe('logging', () => {
    it('never logs the serial, the card number, the health number or the raw barcode', async () => {
      renderScreen()

      await scan([serial, pdf417(BC_COMBO_BARCODE_K)])

      const loggedArguments = JSON.stringify(debugSpy.mock.calls)
      for (const sensitive of ['K00023254', '9123456789', 'K12345678', BC_COMBO_BARCODE_K]) {
        expect(loggedArguments).not.toContain(sensitive)
      }
    })

    it('logs each decoded barcode with its type and source only', async () => {
      renderScreen()

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
      renderScreen()

      await scan([damaged])

      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Failed to decode barcode', {
        type: 'pdf-417',
        reason: 'damaged',
      })
    })

    it('logs that an unknown barcode was skipped, with no payload', async () => {
      renderScreen()

      await scan([unknown])

      expect(debugSpy).toHaveBeenCalledWith('[DecodeBarcodes] Skipping unknown barcode')
    })
  })
})
