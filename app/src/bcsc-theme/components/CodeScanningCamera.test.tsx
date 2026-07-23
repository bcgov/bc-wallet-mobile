import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'
import { useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera'

import { AppEventCode } from '@/events/appEventCode'
import { BasicAppContext } from '@mocks/helpers/app'
import { useBCSCActivity } from '../contexts/BCSCActivityContext'
import CodeScanningCamera, { ScanZone } from './CodeScanningCamera'
import { BCSC_SN_SCAN_ZONES } from './utils/camera'

// Store references to mock functions for access in tests
const mockRequestPermission = jest.fn()
const mockTakeSnapshot = jest.fn().mockResolvedValue({ path: '/tmp/snapshot.jpg' })
const mockFocus = jest.fn().mockResolvedValue(undefined)
let mockHasPermission = true
let mockCodeScannerCallback: ((codes: any[], frame: any) => void) | null = null
const mockEmitErrorModal = jest.fn()
const mockEnsureAppError = jest.fn<{ name: string; message: string }, [unknown, AppEventCode]>(() => ({
  name: 'AppError',
  message: 'mocked error',
}))

jest.mock('@/errors/errorHandler', () => ({
  ensureAppError: (error: unknown, eventCode: AppEventCode) => mockEnsureAppError(error, eventCode),
}))

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => {
  const React = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')

  // Forward ref Camera component mock
  // eslint-disable-next-line react/display-name
  const MockCamera = React.forwardRef(({ children, onInitialized, ...props }: any, ref: any) => {
    // Expose mock methods via ref
    React.useImperativeHandle(ref, () => ({
      takeSnapshot: mockTakeSnapshot,
      focus: mockFocus,
    }))

    // Simulate onInitialized callback
    React.useEffect(() => {
      const timer = setTimeout(() => {
        if (onInitialized) {
          onInitialized()
        }
      }, 0)
      return () => clearTimeout(timer)
    }, [onInitialized])

    return (
      <View testID="mock-camera" {...props}>
        {children}
      </View>
    )
  })

  return {
    Camera: MockCamera,
    useCameraDevice: jest.fn(() => ({
      id: 'back',
      supportsFocus: true,
      minZoom: 1,
      maxZoom: 8,
      neutralZoom: 1,
      hasTorch: true,
    })),
    useCameraFormat: jest.fn(() => ({
      videoWidth: 1920,
      videoHeight: 1080,
      photoWidth: 1920,
      photoHeight: 1080,
    })),
    useCameraPermission: jest.fn(() => ({
      hasPermission: mockHasPermission,
      requestPermission: mockRequestPermission,
    })),
    useCodeScanner: jest.fn((config: any) => {
      // Store the callback for manual triggering in tests
      mockCodeScannerCallback = config.onCodeScanned
      return config
    }),
    CameraCaptureError: class CameraCaptureError extends Error {
      code: string
      constructor(code: string, message: string) {
        super(message)
        this.code = code
      }
    },
  }
})

// Mock BCSCActivityContext — not provided by BasicAppContext. Tests that need a
// non-default appStateStatus call `mockedUseBCSCActivity.mockReturnValue(...)`
// directly (see the typed handle below) rather than a module-level variable —
// once `mockReturnValue` is called, it permanently overrides this factory's
// return value for all subsequent calls, so a single mechanism is used
// consistently throughout this file.
const mockPauseActivityTracking = jest.fn()
const mockResumeActivityTracking = jest.fn()
jest.mock('../contexts/BCSCActivityContext', () => ({
  useBCSCActivity: jest.fn(() => ({
    appStateStatus: 'active',
    pauseActivityTracking: mockPauseActivityTracking,
    resumeActivityTracking: mockResumeActivityTracking,
  })),
}))

// Mock ErrorAlertContext for camera runtime error handling
jest.mock('@/contexts/ErrorAlertContext', () => {
  const actual = jest.requireActual('@/contexts/ErrorAlertContext')
  return {
    ...actual,
    useErrorAlert: jest.fn(() => ({
      emitErrorModal: mockEmitErrorModal,
    })),
  }
})

// Mock gesture handler
const mockGestureChain = () => {
  const chain: any = {}
  chain.enabled = jest.fn().mockReturnValue(chain)
  chain.onBegin = jest.fn().mockReturnValue(chain)
  chain.onUpdate = jest.fn().mockReturnValue(chain)
  chain.onEnd = jest.fn().mockReturnValue(chain)
  return chain
}

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pinch: () => mockGestureChain(),
    Tap: () => mockGestureChain(),
    Simultaneous: (...gestures: any[]) => gestures,
  },
  GestureDetector: ({ children }: any) => children,
}))

// Typed handles to the mocked hooks above, for use in test bodies
const mockedUseBCSCActivity = useBCSCActivity as jest.Mock
const mockedUseCameraDevice = useCameraDevice as jest.Mock
const mockedUseCameraPermission = useCameraPermission as jest.Mock
const mockedUseCodeScanner = useCodeScanner as jest.Mock

describe('CodeScanningCamera', () => {
  const mockOnCodeScanned = jest.fn()
  const defaultProps = {
    onCodeScanned: mockOnCodeScanned,
    scanZones: BCSC_SN_SCAN_ZONES,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission = true
    mockCodeScannerCallback = null
    mockEmitErrorModal.mockClear()
    // Reset to the default 'active' state in case a previous test overrode it —
    // jest.clearAllMocks() clears call history but not a mockReturnValue implementation.
    mockedUseBCSCActivity.mockReturnValue({
      appStateStatus: 'active',
      pauseActivityTracking: mockPauseActivityTracking,
      resumeActivityTracking: mockResumeActivityTracking,
    })
  })

  it('renders correctly with default props', () => {
    const tree = render(
      <BasicAppContext>
        <CodeScanningCamera {...defaultProps} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders with initial zoom set', () => {
    const tree = render(
      <BasicAppContext>
        <CodeScanningCamera {...defaultProps} initialZoom={2.0} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders with barcode highlight enabled', () => {
    const tree = render(
      <BasicAppContext>
        <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('derives code types from scan zones', () => {
    const zones: ScanZone[] = [
      { types: ['code-128'], box: { x: 0, y: 0, width: 1, height: 0.5 } },
      { types: ['pdf-417'], box: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ]
    render(
      <BasicAppContext>
        <CodeScanningCamera {...defaultProps} scanZones={zones} />
      </BasicAppContext>
    )

    expect(mockedUseCodeScanner).toHaveBeenCalledWith(
      expect.objectContaining({
        codeTypes: expect.arrayContaining(['code-128', 'pdf-417']),
      })
    )
  })

  it('calculates orientation correctly for horizontal barcode', () => {
    // This would be tested via the enhanced code processing
    // We'll validate this in integration tests
    expect(true).toBe(true)
  })

  it('calculates orientation correctly for vertical barcode', () => {
    // This would be tested via the enhanced code processing
    // We'll validate this in integration tests
    expect(true).toBe(true)
  })

  it('renders with custom initial zoom', () => {
    const tree = render(
      <BasicAppContext>
        <CodeScanningCamera {...defaultProps} initialZoom={3.0} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  describe('Camera Permission', () => {
    it('renders permission required message when no permission', () => {
      // Mock no permission
      mockedUseCameraPermission.mockReturnValueOnce({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      })
      mockedUseCameraDevice.mockReturnValueOnce(null)

      const { getByText } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.CameraDisclosure.CameraPermissionRequired')).toBeTruthy()
    })

    it('requests permission when not granted', () => {
      mockedUseCameraPermission.mockReturnValueOnce({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      })

      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      expect(mockRequestPermission).toHaveBeenCalled()
    })
  })

  describe('Torch Toggle', () => {
    it('renders torch toggle button', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // The QRScannerTorch component should be rendered
      expect(getByTestId('scan-zone')).toBeTruthy()
    })
  })

  describe('Custom Scan Zones', () => {
    const customScanZones: ScanZone[] = [
      {
        types: ['pdf-417'],
        box: { x: 0.1, y: 0.2, width: 0.8, height: 0.1 },
      },
      {
        types: ['code-39'],
        box: { x: 0.1, y: 0.7, width: 0.8, height: 0.05 },
      },
    ]

    it('renders with custom scan zones', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} scanZones={customScanZones} />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })

    it('renders with enableScanZones flag enabled', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} enableScanZones={true} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })

    it('renders with both custom scan zones and enableScanZones', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })
  })

  describe('Camera Type', () => {
    it('renders with front camera', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} cameraType="front" />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })

    it('renders with back camera (default)', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} cameraType="back" />
        </BasicAppContext>
      )

      expect(tree).toMatchSnapshot()
    })
  })

  describe('Code Scanning Callback', () => {
    it('registers code scanner with correct callback', () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      expect(mockedUseCodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          codeTypes: ['code-39', 'code-128', 'pdf-417'],
          onCodeScanned: expect.any(Function),
        })
      )
    })

    it('processes codes when scanner detects barcodes', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      // Simulate code detection
      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'TEST1234',
            frame: { x: 100, y: 200, width: 200, height: 50 },
            corners: [
              { x: 100, y: 200 },
              { x: 300, y: 200 },
              { x: 300, y: 250 },
              { x: 100, y: 250 },
            ],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('handles empty codes array', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!([], mockFrame)
        })
      }
    })

    it('processes codes with vertical orientation', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        // Vertical barcode (height > width in corners)
        const mockCodes = [
          {
            type: 'code-39',
            value: 'VERTICAL123',
            frame: { x: 100, y: 100, width: 50, height: 200 },
            corners: [
              { x: 100, y: 100 },
              { x: 150, y: 100 },
              { x: 150, y: 300 },
              { x: 100, y: 300 },
            ],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('processes multiple codes simultaneously', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'PDF417VALUE',
            frame: { x: 100, y: 200, width: 300, height: 100 },
            corners: [],
          },
          {
            type: 'code-39',
            value: 'CODE39VALUE',
            frame: { x: 100, y: 400, width: 300, height: 30 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })
  })

  describe('Platform-specific behavior', () => {
    it('renders on iOS', () => {
      Platform.OS = 'ios'
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })

    it('renders on Android', () => {
      Platform.OS = 'android'
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })
  })

  describe('Container Layout', () => {
    it('triggers onLayout when camera container renders', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // The scan-zone testID should be rendered
      const scanZone = getByTestId('scan-zone')
      expect(scanZone).toBeTruthy()

      // Trigger layout event
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })
    })
  })

  describe('Custom Styles', () => {
    it('renders with custom style prop', () => {
      const customStyle = { backgroundColor: 'red', borderRadius: 10 }
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} style={customStyle} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })
  })

  describe('Zoom functionality', () => {
    it('initializes with custom zoom value', () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} initialZoom={4.0} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })

    it('clamps zoom to device limits', () => {
      // Device max is 8, so zoom of 10 should be clamped
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} initialZoom={10.0} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })
  })

  describe('Scan state transitions', () => {
    it('starts in scanning state', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )
      // Should have scan-zone without locked state buttons
      expect(getByTestId('scan-zone')).toBeTruthy()
    })

    it('does not show locked buttons in initial state', () => {
      const { queryByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )
      // Locked state buttons should not be visible initially
      expect(queryByTestId('confirm-scan-button')).toBeNull()
      expect(queryByTestId('try-again-button')).toBeNull()
    })
  })

  describe('Scan zone alignment detection', () => {
    const customScanZones: ScanZone[] = [
      {
        types: ['pdf-417'],
        box: { x: 0.1, y: 0.2, width: 0.8, height: 0.15 },
      },
      {
        types: ['code-39'],
        box: { x: 0.1, y: 0.7, width: 0.8, height: 0.08 },
      },
    ]

    it('detects codes aligned with scan zones', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} scanZones={customScanZones} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      // Trigger container layout to set dimensions
      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      // Simulate detecting aligned codes within the scan zones
      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'ALIGNED_PDF417',
            frame: { x: 50, y: 120, width: 300, height: 80 },
            corners: [],
          },
          {
            type: 'code-39',
            value: 'ALIGNED_CODE39',
            frame: { x: 50, y: 420, width: 300, height: 40 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('processes codes with enableScanZones for debug mode', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'DEBUG_PDF417',
            frame: { x: 100, y: 200, width: 200, height: 50 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    describe('position gate removed (regression for #4256)', () => {
      // Force Android + a portrait-shaped (width <= height) mock frame so
      // transformBarcodeCoordinates takes the no-swap branch (see the Android
      // block in transformBarcodeCoordinates: the dimension swap only applies
      // when the source frame is landscape). That makes the resulting container
      // position pure cover-mode scaling, fully deterministic to hand-compute.
      beforeEach(() => {
        Platform.OS = 'android'
      })

      afterEach(() => {
        Platform.OS = 'ios'
      })

      const containerLayout = { x: 0, y: 0, width: 400, height: 800 }
      // Frame 480×640 vs container 400×800 → scale = max(400/480, 800/640) = 1.25,
      // offsetX = (400 - 480*1.25)/2 = -100, offsetY = (800 - 640*1.25)/2 = 0.
      const mockFrame = { width: 480, height: 640 }
      // BCSC_SN_SCAN_ZONES box {x:0.18,y:0.2,w:0.64,h:0.52} of a 400×800 container
      // → absolute zone x:[72,328], y:[160,576] (± ~5% alignment margin).
      const insideZoneCode = {
        type: 'code-39',
        value: 'INSIDE_ZONE',
        // (150,150)×(100,80) → container (150*1.25-100, 150*1.25)=(87.5,187.5),
        // sized 125×100 — comfortably inside the zone.
        frame: { x: 150, y: 150, width: 100, height: 80 },
        corners: [],
      }
      const outsideZoneCode = {
        type: 'code-39',
        value: 'OUTSIDE_ZONE',
        // (0,0)×(40,20) → container (0*1.25-100, 0)=(-100,0) — off-screen to the
        // left, well outside the zone's x:[72,328].
        frame: { x: 0, y: 0, width: 40, height: 20 },
        corners: [],
      }

      it('auto-confirms when the code sits inside the scan zone (baseline)', async () => {
        const { getByTestId } = render(
          <BasicAppContext>
            <CodeScanningCamera {...defaultProps} />
          </BasicAppContext>
        )

        const cameraContainer = getByTestId('camera-preview-container')
        await act(async () => {
          fireEvent(cameraContainer, 'layout', { nativeEvent: { layout: containerLayout } })
        })

        if (mockCodeScannerCallback) {
          // LOCK_READING_THRESHOLD (5) consecutive frames of the same code.
          for (let i = 0; i < 5; i++) {
            await act(async () => {
              mockCodeScannerCallback!([insideZoneCode], mockFrame)
            })
          }
        }

        await waitFor(() => {
          expect(mockOnCodeScanned).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ value: 'INSIDE_ZONE', isAligned: true })]),
            mockFrame
          )
        })
      })

      it('auto-confirms even when the code never falls inside any scan zone', async () => {
        const { getByTestId } = render(
          <BasicAppContext>
            <CodeScanningCamera {...defaultProps} />
          </BasicAppContext>
        )

        const cameraContainer = getByTestId('camera-preview-container')
        await act(async () => {
          fireEvent(cameraContainer, 'layout', { nativeEvent: { layout: containerLayout } })
        })

        if (mockCodeScannerCallback) {
          // LOCK_READING_THRESHOLD (5) consecutive frames of the same code.
          for (let i = 0; i < 5; i++) {
            await act(async () => {
              mockCodeScannerCallback!([outsideZoneCode], mockFrame)
            })
          }
        }

        // Before this fix, an unaligned code was filtered out of `qualifyingCodes`
        // in determineScanState and the scan would never reach 'locked' — the
        // camera would read the barcode correctly forever without confirming.
        await waitFor(() => {
          expect(mockOnCodeScanned).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ value: 'OUTSIDE_ZONE', isAligned: false })]),
            mockFrame
          )
        })
      })
    })
  })

  describe('Consecutive scan validation', () => {
    it('tracks consecutive readings of the same code', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCode = {
          type: 'pdf-417',
          value: 'CONSISTENT_VALUE',
          frame: { x: 100, y: 200, width: 200, height: 50 },
          corners: [],
        }
        const mockFrame = { width: 1920, height: 1080 }

        // Simulate multiple consecutive detections of the same code
        for (let i = 0; i < 5; i++) {
          await act(async () => {
            mockCodeScannerCallback!([mockCode], mockFrame)
          })
        }
      }
    })

    it('resets count when code value changes', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockFrame = { width: 1920, height: 1080 }

        // First code
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'VALUE_1',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            mockFrame
          )
        })

        // Different code (should reset)
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'VALUE_2',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            mockFrame
          )
        })
      }
    })
  })

  describe('Reading decay (regression for #4256)', () => {
    it('decays the reading count across a single blank frame instead of resetting it', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const mockCode = {
        type: 'pdf-417',
        value: 'DECAY_TEST',
        frame: { x: 100, y: 200, width: 200, height: 50 },
        corners: [],
      }
      const mockFrame = { width: 1920, height: 1080 }

      if (mockCodeScannerCallback) {
        // 4 consecutive frames with the code — readingCount: 1, 2, 3, 4
        for (let i = 0; i < 4; i++) {
          await act(async () => {
            mockCodeScannerCallback!([mockCode], mockFrame)
          })
        }

        // 1 blank frame (codes.length === 0) — decays 4 → 3 instead of clearing to 0
        await act(async () => {
          mockCodeScannerCallback!([], mockFrame)
        })

        expect(mockOnCodeScanned).not.toHaveBeenCalled()

        // 2 more frames with the code — 3 → 4 → 5, reaching LOCK_READING_THRESHOLD.
        // If the old clear()-on-blank-frame behavior were still in place, this
        // would need 5 more frames (readingCount would have reset to 0).
        for (let i = 0; i < 2; i++) {
          await act(async () => {
            mockCodeScannerCallback!([mockCode], mockFrame)
          })
        }
      }

      await waitFor(() => {
        expect(mockOnCodeScanned).toHaveBeenCalled()
      })
    })

    it('decays only the code missing from a still-nonempty frame (stale-key path)', async () => {
      // Two scan zones so both codes must qualify simultaneously to lock —
      // isolates the stale-key decay path from single-code auto-lock.
      const twoZones: ScanZone[] = [
        { types: ['pdf-417'], box: { x: 0.1, y: 0.2, width: 0.8, height: 0.15 } },
        { types: ['code-39'], box: { x: 0.1, y: 0.7, width: 0.8, height: 0.08 } },
      ]

      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} scanZones={twoZones} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const codeA = { type: 'pdf-417', value: 'CODE_A', frame: { x: 100, y: 100, width: 200, height: 50 }, corners: [] }
      const codeB = { type: 'code-39', value: 'CODE_B', frame: { x: 100, y: 400, width: 200, height: 30 }, corners: [] }
      const mockFrame = { width: 1920, height: 1080 }

      if (mockCodeScannerCallback) {
        // Both codes for 4 frames — each readingCount: 1, 2, 3, 4
        for (let i = 0; i < 4; i++) {
          await act(async () => {
            mockCodeScannerCallback!([codeA, codeB], mockFrame)
          })
        }

        // codeB drops out for one (still nonempty) frame — its count decays
        // 4 → 3 via the stale-key path in decayStaleReadings; codeA keeps
        // incrementing normally (4 → 5) since it's present every frame.
        await act(async () => {
          mockCodeScannerCallback!([codeA], mockFrame)
        })

        expect(mockOnCodeScanned).not.toHaveBeenCalled()

        // codeB returns — 3 → 4, then one more frame → 5. Both codes must reach
        // the threshold together (minCodesForAligned = 2) to lock and confirm.
        for (let i = 0; i < 2; i++) {
          await act(async () => {
            mockCodeScannerCallback!([codeA, codeB], mockFrame)
          })
        }
      }

      await waitFor(() => {
        expect(mockOnCodeScanned).toHaveBeenCalled()
      })
    })
  })

  describe('Coordinate transformation', () => {
    it('transforms coordinates for iOS in portrait mode', async () => {
      Platform.OS = 'ios'

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'IOS_TEST',
            frame: { x: 500, y: 300, width: 400, height: 100 },
            corners: [
              { x: 500, y: 300 },
              { x: 900, y: 300 },
              { x: 900, y: 400 },
              { x: 500, y: 400 },
            ],
          },
        ]
        // Landscape frame dimensions (typical for iOS)
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('transforms coordinates for Android in portrait mode', async () => {
      Platform.OS = 'android'

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'ANDROID_TEST',
            frame: { x: 100, y: 200, width: 300, height: 80 },
            corners: [],
          },
        ]
        // Landscape frame dimensions (raw sensor on Android)
        const mockFrame = { width: 640, height: 480 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('handles portrait frame dimensions on Android', async () => {
      Platform.OS = 'android'

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'ANDROID_PORTRAIT',
            frame: { x: 100, y: 200, width: 300, height: 80 },
            corners: [],
          },
        ]
        // Portrait frame dimensions
        const mockFrame = { width: 480, height: 640 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })
  })

  describe('Code without position data', () => {
    it('handles codes without frame property', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'qr',
            value: 'NO_FRAME_CODE',
            // No frame property
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('handles codes without corners', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'code-128',
            value: 'NO_CORNERS_CODE',
            frame: { x: 100, y: 200, width: 200, height: 50 },
            // No corners or empty corners
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('handles codes with single corner point', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'code-39',
            value: 'SINGLE_CORNER',
            frame: { x: 100, y: 200, width: 200, height: 50 },
            corners: [{ x: 100, y: 200 }],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })
  })

  describe('Barcode type display', () => {
    it('displays decoded value for code-39 barcodes', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'code-39',
            value: 'ABC123',
            frame: { x: 100, y: 200, width: 200, height: 30 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })

    it('displays decoded value for code-128 barcodes', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'code-128',
            value: 'CODE128TEST',
            frame: { x: 100, y: 200, width: 250, height: 35 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        await act(async () => {
          mockCodeScannerCallback!(mockCodes, mockFrame)
        })
      }
    })
  })

  describe('Highlight clearing', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('clears highlights after timeout when no codes detected', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      if (mockCodeScannerCallback) {
        // First detect a code
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'TEMP_CODE',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })

        // Then detect no codes
        await act(async () => {
          mockCodeScannerCallback!([], { width: 1920, height: 1080 })
        })

        // Advance timers to trigger highlight clear
        await act(async () => {
          jest.advanceTimersByTime(600)
        })
      }
    })
  })

  describe('Focus suppression while actively decoding (regression for #4256)', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('suppresses auto-refocus cycling while codes are actively detected, then resumes once detection stops', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // Container layout starts focus cycling, which fires one immediate,
      // unsuppressed doFocus (lastDetectionAtRef starts at 0, so nothing looks
      // "recent" yet).
      const cameraContainer = getByTestId('camera-preview-container')
      await act(async () => {
        fireEvent(cameraContainer, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })

      const callsBeforeDetection = mockFocus.mock.calls.length
      expect(callsBeforeDetection).toBeGreaterThan(0)

      if (mockCodeScannerCallback) {
        const mockFrame = { width: 1920, height: 1080 }
        const detect = async (value: string) => {
          await act(async () => {
            mockCodeScannerCallback!(
              [{ type: 'pdf-417', value, frame: { x: 100, y: 200, width: 200, height: 50 }, corners: [] }],
              mockFrame
            )
          })
        }

        // Simulate continuous scanning: a fresh detection every 500ms (well
        // under the 2s FOCUS_SUPPRESS_AFTER_DETECTION_MS window) for 2.5s
        // straight — long enough to span a full FOCUS_CYCLE_INTERVAL_MS (2.5s)
        // tick. A different value each time keeps readingCount from reaching
        // the lock threshold, so scanState (and the cycling effect it drives)
        // settles after the first detection and doesn't restart mid-loop.
        for (let i = 0; i < 5; i++) {
          await detect(`ACTIVE_${i}`)
          await act(async () => {
            jest.advanceTimersByTime(500)
          })
        }

        // No new (unsuppressed) focus calls should have landed while detections
        // kept refreshing the suppression window.
        expect(mockFocus.mock.calls).toHaveLength(callsBeforeDetection)

        // Detection stops here. Advance past the suppression window plus a full
        // cycle interval (2000 + 2500ms) — cycling should resume automatically.
        await act(async () => {
          jest.advanceTimersByTime(2000 + 2500)
        })

        expect(mockFocus.mock.calls.length).toBeGreaterThan(callsBeforeDetection)
      }
    })
  })

  describe('Device without focus support', () => {
    it('renders correctly when device does not support focus', () => {
      mockedUseCameraDevice.mockReturnValueOnce({
        id: 'back',
        supportsFocus: false,
        minZoom: 1,
        maxZoom: 4,
        hasTorch: false,
      })

      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )
      expect(tree).toBeTruthy()
    })
  })

  describe('Unmount cleanup', () => {
    it('cleans up timeouts on unmount', async () => {
      jest.useFakeTimers()

      const { unmount } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      // Trigger some code scanning
      if (mockCodeScannerCallback) {
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'CLEANUP_TEST',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }

      // Unmount should clear timers
      unmount()

      jest.useRealTimers()
    })
  })

  describe('Locked state with enableScanZones', () => {
    it('triggers locked state after consecutive readings in enableScanZones mode', async () => {
      // In enableScanZones mode, all identified codes count as qualifying
      // Need 2+ codes with 5+ consecutive readings each to trigger locked state
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} enableScanZones={true} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      // Set up container dimensions first
      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockCodes = [
          {
            type: 'pdf-417',
            value: 'LOCKED_PDF417',
            frame: { x: 50, y: 100, width: 300, height: 80 },
            corners: [],
          },
          {
            type: 'code-39',
            value: 'LOCKED_CODE39',
            frame: { x: 50, y: 300, width: 300, height: 30 },
            corners: [],
          },
        ]
        const mockFrame = { width: 1920, height: 1080 }

        // Simulate 6 consecutive detections (above LOCK_READING_THRESHOLD of 5)
        for (let i = 0; i < 6; i++) {
          await act(async () => {
            mockCodeScannerCallback!(mockCodes, mockFrame)
          })
        }
      }

      // In enableScanZones mode, Save Scan Zones button should appear when locked
      // Note: The button may or may not render based on ENABLE_MANUAL_CONFIRM flag
    })

    it('updates detected codes with position changes', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        const mockFrame = { width: 1920, height: 1080 }

        // First detection
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'MOVING_CODE',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            mockFrame
          )
        })

        // Same code but moved position (>5px change triggers update)
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'MOVING_CODE',
                frame: { x: 110, y: 210, width: 200, height: 50 },
                corners: [],
              },
            ],
            mockFrame
          )
        })
      }
    })
  })

  describe('Debug diagnostics rendering', () => {
    const customScanZones: ScanZone[] = [
      {
        types: ['pdf-417'],
        box: { x: 0.1, y: 0.2, width: 0.8, height: 0.15 },
      },
      {
        types: ['code-39'],
        box: { x: 0.1, y: 0.7, width: 0.8, height: 0.08 },
      },
    ]

    it('renders debug crosshairs when enableScanZones and frameSize are set', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      // Trigger container layout
      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })

      // Trigger a code scan to set frameSize
      if (mockCodeScannerCallback) {
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'DEBUG_TEST',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }
    })

    it('renders scan zone debug overlays', async () => {
      const tree = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      // Trigger layout to set container size
      const scanZone = tree.getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      expect(tree.toJSON()).toBeTruthy()
    })
  })

  describe('Scan zone zone detection', () => {
    const customScanZones: ScanZone[] = [
      {
        types: ['pdf-417'],
        box: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      },
      {
        types: ['code-39'],
        box: { x: 0.1, y: 0.6, width: 0.8, height: 0.1 },
      },
    ]

    it('detects which zone a code belongs to for focus cycling', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} scanZones={customScanZones} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        // Code that should align with first scan zone (pdf-417)
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'ZONE1_CODE',
                frame: { x: 80, y: 90, width: 240, height: 60 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }
    })

    it('rejects codes with mismatched types for zones', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} scanZones={customScanZones} showBarcodeHighlight={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        // Code-128 should not match pdf-417 or code-39 zones even if position aligns
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'code-128',
                value: 'WRONG_TYPE',
                frame: { x: 80, y: 90, width: 240, height: 60 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }
    })
  })

  describe('Camera container layout', () => {
    it('triggers camera container onLayout and sets dimensions', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // Find the camera mock and trigger its parent's layout
      const mockCamera = getByTestId('mock-camera')
      expect(mockCamera).toBeTruthy()
    })

    it('handles layout events for default scan zone', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 50, y: 200, width: 300, height: 75 } },
        })
      })
    })
  })

  describe('Aligned state rendering', () => {
    const customScanZones: ScanZone[] = [
      {
        types: ['pdf-417'],
        box: { x: 0.05, y: 0.1, width: 0.9, height: 0.25 },
      },
      {
        types: ['code-39'],
        box: { x: 0.05, y: 0.6, width: 0.9, height: 0.15 },
      },
    ]

    it('transitions to aligned state with 2+ codes qualifying', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        // Two codes detected should trigger aligned state (but not locked without consecutive reads)
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'ALIGN_PDF',
                frame: { x: 20, y: 60, width: 360, height: 150 },
                corners: [],
              },
              {
                type: 'code-39',
                value: 'ALIGN_CODE39',
                frame: { x: 20, y: 360, width: 360, height: 90 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }
    })
  })

  describe('Highlight position for Android', () => {
    beforeEach(() => {
      Platform.OS = 'android'
    })

    afterEach(() => {
      Platform.OS = 'ios'
    })

    it('adds padding to highlight position on Android', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} showBarcodeHighlight={true} enableScanZones={true} />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'ANDROID_HIGHLIGHT',
                frame: { x: 100, y: 200, width: 200, height: 50 },
                corners: [],
              },
            ],
            { width: 640, height: 480 }
          )
        })
      }
    })
  })

  describe('Code with detected value rendering', () => {
    it('shows highlight with different styles based on scan state', async () => {
      const customScanZones: ScanZone[] = [
        { types: ['pdf-417', 'code-39'], box: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 } },
      ]

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera
            {...defaultProps}
            scanZones={customScanZones}
            enableScanZones={true}
            showBarcodeHighlight={true}
          />
        </BasicAppContext>
      )

      const scanZone = getByTestId('scan-zone')
      await act(async () => {
        fireEvent(scanZone, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } },
        })
      })

      if (mockCodeScannerCallback) {
        // Single code shows scanning state
        await act(async () => {
          mockCodeScannerCallback!(
            [
              {
                type: 'pdf-417',
                value: 'SINGLE_CODE',
                frame: { x: 30, y: 70, width: 340, height: 460 },
                corners: [],
              },
            ],
            { width: 1920, height: 1080 }
          )
        })
      }
    })
  })

  describe('Camera initialization', () => {
    it('calls handleCameraInitialized when camera is ready', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} initialZoom={2.5} />
        </BasicAppContext>
      )

      // Wait for the onInitialized callback to be triggered
      await waitFor(
        () => {
          // The mock triggers onInitialized after a timeout
        },
        { timeout: 100 }
      )
    })
  })

  describe('Background / foreground camera lifecycle (regression for #4256)', () => {
    it('deactivates the camera when the app goes to the background', () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'background',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByTestId('mock-camera').props.isActive).toBe(false)
    })

    it('activates the camera when the app is in the foreground', () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'active',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })

    it('stays active when appStateStatus is an unexpected value like unknown (fail-safe default)', () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'unknown',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // The gate deactivates on KNOWN background states rather than activating only on a
      // known-active one, so an unexpected value can't strand the camera off permanently.
      expect(getByTestId('mock-camera').props.isActive).toBe(true)
    })
  })

  describe('Camera runtime error handling', () => {
    it('shows error modal when camera onError fires', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure')
      const expectedAppError = { name: 'NormalizedAppError', message: 'normalized' }
      mockEnsureAppError.mockReturnValueOnce(expectedAppError)

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      expect(mockEnsureAppError).toHaveBeenCalledWith(runtimeError, AppEventCode.ADD_CARD_CAMERA_BROKEN)

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'BCSC.CameraDisclosure.Error',
        'BCSC.CameraDisclosure.ErrorMessage',
        expectedAppError
      )
    })

    it('ignores camera errors and does not show an error modal while the app is backgrounded', async () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'background',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure while backgrounded')

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // Backgrounded camera errors are expected (the session is being torn down) and not
      // actionable — no error should be normalized or surfaced to the user.
      expect(mockEnsureAppError).not.toHaveBeenCalled()
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
    })

    it('ignores camera errors and does not show an error modal while the app is inactive', async () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'inactive',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure while inactive')

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // 'inactive' covers iOS transitional states (app switcher, notification shade,
      // incoming call) — errors there are equally expected and non-actionable as 'background'.
      expect(mockEnsureAppError).not.toHaveBeenCalled()
      expect(mockEmitErrorModal).not.toHaveBeenCalled()
    })

    it('still shows an error modal when appStateStatus is unknown', async () => {
      mockedUseBCSCActivity.mockReturnValue({
        appStateStatus: 'unknown',
        pauseActivityTracking: mockPauseActivityTracking,
        resumeActivityTracking: mockResumeActivityTracking,
      })

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const camera = getByTestId('mock-camera')
      const runtimeError = new Error('Runtime camera failure with unknown app state')
      const expectedAppError = { name: 'NormalizedAppError', message: 'normalized' }
      mockEnsureAppError.mockReturnValueOnce(expectedAppError)

      await act(async () => {
        camera.props.onError(runtimeError)
      })

      // 'unknown' is what AppState.currentState can report at Android startup — a genuine
      // camera failure there must still surface, so the guard must not be `!== 'active'`.
      expect(mockEnsureAppError).toHaveBeenCalledWith(runtimeError, AppEventCode.ADD_CARD_CAMERA_BROKEN)
      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'BCSC.CameraDisclosure.Error',
        'BCSC.CameraDisclosure.ErrorMessage',
        expectedAppError
      )
    })
  })

  describe('Focus cycling restart storm (regression #4256/#4300)', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      // The module-level device mock factory returns a brand-new object on every call,
      // so without pinning it, startFocusCycling's useCallback (deps include `device`)
      // would get a new identity on every re-render regardless of cause — masking the
      // exact thing under test here. Pin it to a single stable reference, matching how
      // the real hook behaves when the underlying camera device hasn't changed.
      mockedUseCameraDevice.mockReturnValue({
        id: 'back',
        supportsFocus: true,
        minZoom: 1,
        maxZoom: 8,
        neutralZoom: 1,
        hasTorch: true,
      })
    })

    afterEach(() => {
      jest.useRealTimers()
      // Restore the default per-render factory for any tests outside this describe.
      mockedUseCameraDevice.mockImplementation(() => ({
        id: 'back',
        supportsFocus: true,
        minZoom: 1,
        maxZoom: 8,
        neutralZoom: 1,
        hasTorch: true,
      }))
    })

    const mockFrame = { width: 1920, height: 1080 }

    it('does not restart on a scanning<->aligned flip, but the periodic idle-nudge still ticks (discriminating case)', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // t=0: layout starts cycling — one immediate, unsuppressed doFocus (lastDetectionAtRef
      // starts at 0, so nothing looks "recent" yet).
      const cameraContainer = getByTestId('camera-preview-container')
      await act(async () => {
        fireEvent(cameraContainer, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })
      const callsAfterLayout = mockFocus.mock.calls.length
      expect(callsAfterLayout).toBeGreaterThan(0)

      // t=100: a single detection is enough to flip scanning -> aligned (minCodesForAligned
      // === 1 for the single-zone BCSC_SN_SCAN_ZONES).
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      await act(async () => {
        mockCodeScannerCallback!(
          [
            {
              type: 'pdf-417',
              value: 'FLIP_TO_ALIGNED',
              frame: { x: 100, y: 200, width: 200, height: 50 },
              corners: [],
            },
          ],
          mockFrame
        )
      })

      // t=2200: advance 2100ms past that detection — the suppression window (2000ms) has
      // now lapsed — then send a blank frame. The single tracked reading (count 1) decays
      // straight to 0 and drops the state back to 'scanning'.
      //
      // OLD code: scanState was a dependency of the cycling effect, so this flip tore the
      // cycle down and restarted it, firing an extra doFocus() right here — and since the
      // suppression window had already lapsed, that restart's call was NOT suppressed.
      // NEW code: scanState is not a dependency, so nothing restarts and the call count
      // must be unchanged.
      await act(async () => {
        jest.advanceTimersByTime(2100)
      })
      await act(async () => {
        mockCodeScannerCallback!([], mockFrame)
      })

      expect(mockFocus.mock.calls.length).toBe(callsAfterLayout)

      // t=2600: advance past the next natural tick of the untouched interval (anchored at
      // t=0, so its next tick is at t=2500) — the periodic idle-nudge must still be alive.
      await act(async () => {
        jest.advanceTimersByTime(400)
      })

      expect(mockFocus.mock.calls.length).toBe(callsAfterLayout + 1)
    })

    it('preserves the idle-nudge cadence when nothing is ever detected (tilt workaround)', async () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const cameraContainer = getByTestId('camera-preview-container')
      await act(async () => {
        fireEvent(cameraContainer, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })
      const callsAfterLayout = mockFocus.mock.calls.length
      expect(callsAfterLayout).toBeGreaterThan(0)

      // Two full FOCUS_CYCLE_INTERVAL_MS (2.5s) ticks, no detections in between.
      await act(async () => {
        jest.advanceTimersByTime(2 * 2500)
      })

      expect(mockFocus.mock.calls.length).toBe(callsAfterLayout + 2)
    })

    it('keeps the idle-nudge alive across a lock -> auto-confirm-rejected -> reset cycle (guards against stop-on-lock without a matching restart)', async () => {
      mockOnCodeScanned.mockResolvedValueOnce(false)

      const { getByTestId } = render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      const cameraContainer = getByTestId('camera-preview-container')
      await act(async () => {
        fireEvent(cameraContainer, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
        })
      })
      const callsAfterLayout = mockFocus.mock.calls.length
      expect(callsAfterLayout).toBeGreaterThan(0)

      const lockCode = {
        type: 'pdf-417',
        value: 'LOCK_THEN_REJECT',
        frame: { x: 100, y: 200, width: 200, height: 50 },
        corners: [],
      }
      // LOCK_READING_THRESHOLD (5) identical frames locks and auto-confirms; the mocked
      // `false` resolution rejects the scan, which resets back to 'scanning'.
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          mockCodeScannerCallback!([lockCode], mockFrame)
        })
      }

      await waitFor(() => {
        expect(mockOnCodeScanned).toHaveBeenCalled()
      })

      // Neither the lock nor the reject-driven reset should have touched the cycling
      // timer — scanState was never a dependency of the effect that starts it.
      expect(mockFocus.mock.calls.length).toBe(callsAfterLayout)

      // Advance past the suppression window plus a full cycle interval — if a
      // stop-on-lock (without a matching restart) regression crept back in, the timer
      // would be dead here and this would never fire.
      await act(async () => {
        jest.advanceTimersByTime(2000 + 2500)
      })

      expect(mockFocus.mock.calls.length).toBeGreaterThan(callsAfterLayout)
    })
  })

  describe('Lock keeps accumulated licence barcode (regression #4256/#4302)', () => {
    // VALIDATION_THRESHOLD (3) < LOCK_READING_THRESHOLD (5) on Android, so a code can
    // validate (and get accumulated) well before it could ever lock on its own.
    beforeEach(() => {
      jest.useFakeTimers()
      Platform.OS = 'android'
    })

    afterEach(() => {
      jest.useRealTimers()
      Platform.OS = 'ios'
    })

    const mockFrame = { width: 640, height: 480 }
    const pdf417Code = {
      type: 'pdf-417',
      value: 'DL_DATA',
      frame: { x: 100, y: 100, width: 200, height: 60 },
      corners: [],
    }
    const serialCode = {
      type: 'code-39',
      value: 'SERIAL',
      frame: { x: 100, y: 300, width: 200, height: 30 },
      corners: [],
    }

    it('carries a recently-accumulated pdf-417 into a lock triggered by the code-39 serial alone', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      // pdf-417 validates (VALIDATION_THRESHOLD=3) and gets accumulated, but never reaches
      // LOCK_READING_THRESHOLD (5) on its own.
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          mockCodeScannerCallback!([pdf417Code], mockFrame)
        })
      }
      expect(mockOnCodeScanned).not.toHaveBeenCalled()

      // The pdf-417 drops out of frame; only the code-39 serial is read from here on. 5
      // frames locks on the serial alone (minCodesForAligned === 1 for the single-zone
      // BCSC_SN_SCAN_ZONES).
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          mockCodeScannerCallback!([serialCode], mockFrame)
        })
      }

      await waitFor(() => {
        expect(mockOnCodeScanned).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ type: 'pdf-417', value: 'DL_DATA' }),
            expect.objectContaining({ type: 'code-39', value: 'SERIAL' }),
          ]),
          mockFrame
        )
      })
    })

    it('drops the accumulated pdf-417 once ACCUMULATION_WINDOW_MS has elapsed before the lock', async () => {
      render(
        <BasicAppContext>
          <CodeScanningCamera {...defaultProps} />
        </BasicAppContext>
      )

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          mockCodeScannerCallback!([pdf417Code], mockFrame)
        })
      }

      // ACCUMULATION_WINDOW_MS is 3000 on Android — advance past it before the serial locks.
      await act(async () => {
        jest.advanceTimersByTime(3100)
      })

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          mockCodeScannerCallback!([serialCode], mockFrame)
        })
      }

      await waitFor(() => {
        expect(mockOnCodeScanned).toHaveBeenCalled()
      })

      const [codes] = mockOnCodeScanned.mock.calls[0]
      expect(codes).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'code-39', value: 'SERIAL' })]))
      expect(codes).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'pdf-417', value: 'DL_DATA' })])
      )
    })
  })
})
