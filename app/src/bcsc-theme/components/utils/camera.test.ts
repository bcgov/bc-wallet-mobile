import { Platform } from 'react-native'

import {
  EnhancedCode,
  Rect,
  ScanZone,
  calculateBarcodeOrientation,
  clampZoom,
  determineScanState,
  getPaddedHighlightPosition,
  isCodeAlignedWithZones,
  transformBarcodeCoordinates,
} from './camera'

// ─── calculateBarcodeOrientation ──────────────────────────────────────────────

describe('calculateBarcodeOrientation', () => {
  it('returns horizontal when corners is undefined', () => {
    expect(calculateBarcodeOrientation(undefined)).toBe('horizontal')
  })

  it('returns horizontal when fewer than 2 corners', () => {
    expect(calculateBarcodeOrientation([{ x: 0, y: 0 }])).toBe('horizontal')
  })

  it('returns horizontal when barcode is wider than tall', () => {
    // corners[1].x - corners[0].x = 100 (width), corners[2].y - corners[0].y = 20 (height)
    const corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 20 },
      { x: 0, y: 20 },
    ]
    expect(calculateBarcodeOrientation(corners)).toBe('horizontal')
  })

  it('returns vertical when barcode is taller than wide', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 100 },
      { x: 0, y: 100 },
    ]
    expect(calculateBarcodeOrientation(corners)).toBe('vertical')
  })

  it('returns vertical for a square barcode (width === height, not strictly greater)', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ]
    // width > height is false when equal, so falls through to 'vertical'
    expect(calculateBarcodeOrientation(corners)).toBe('vertical')
  })

  it('handles negative coordinates correctly', () => {
    // width = |100 - 0| = 100, height = |0 - (-50)| = 50 → horizontal
    const corners = [
      { x: 0, y: -50 },
      { x: 100, y: -50 },
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ]
    expect(calculateBarcodeOrientation(corners)).toBe('horizontal')
  })
})

// ─── clampZoom ────────────────────────────────────────────────────────────────

describe('clampZoom', () => {
  it('returns the target when within range', () => {
    expect(clampZoom(3, 1, 10)).toBe(3)
  })

  it('clamps to min when target is below range', () => {
    expect(clampZoom(0.5, 1, 10)).toBe(1)
  })

  it('clamps to max when target is above range', () => {
    expect(clampZoom(15, 1, 10)).toBe(10)
  })

  it('returns min when target equals min', () => {
    expect(clampZoom(1, 1, 10)).toBe(1)
  })

  it('returns max when target equals max', () => {
    expect(clampZoom(10, 1, 10)).toBe(10)
  })

  it('handles fractional zoom values', () => {
    expect(clampZoom(1.5, 1, 2)).toBe(1.5)
    expect(clampZoom(0.9, 1, 2)).toBe(1)
    expect(clampZoom(2.1, 1, 2)).toBe(2)
  })
})

// ─── getPaddedHighlightPosition ───────────────────────────────────────────────

describe('getPaddedHighlightPosition', () => {
  const position: Rect = { x: 100, y: 200, width: 300, height: 150 }

  describe('on iOS', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
    })

    it('returns the position unchanged', () => {
      expect(getPaddedHighlightPosition(position)).toEqual(position)
    })

    it('returns the position unchanged with a custom pad', () => {
      expect(getPaddedHighlightPosition(position, 20)).toEqual(position)
    })
  })

  describe('on Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true })
    })

    it('pads all sides by the default 8px', () => {
      expect(getPaddedHighlightPosition(position)).toEqual({
        x: 92,
        y: 192,
        width: 316,
        height: 166,
      })
    })

    it('pads all sides by a custom pad amount', () => {
      expect(getPaddedHighlightPosition(position, 12)).toEqual({
        x: 88,
        y: 188,
        width: 324,
        height: 174,
      })
    })

    it('returns zero-size rect correctly padded', () => {
      expect(getPaddedHighlightPosition({ x: 0, y: 0, width: 0, height: 0 }, 8)).toEqual({
        x: -8,
        y: -8,
        width: 16,
        height: 16,
      })
    })
  })
})

// ─── transformBarcodeCoordinates ──────────────────────────────────────────────

describe('transformBarcodeCoordinates', () => {
  describe('landscape device (no orientation adjustment)', () => {
    const landscapeWindow = { width: 844, height: 390 }

    it('applies only cover-mode scaling when device is landscape', () => {
      // Frame exactly matches container — scale = 1, no offset
      const result = transformBarcodeCoordinates(
        { x: 0, y: 0, width: 100, height: 50 },
        200,
        100,
        200,
        100,
        landscapeWindow
      )
      expect(result).toEqual({ x: 0, y: 0, width: 100, height: 50 })
    })

    it('scales and centers correctly when frame aspect ratio differs from container', () => {
      // Frame: 200×100, Container: 400×400
      // scaleX=400/200=2, scaleY=400/100=4, scale=4
      // offsetX=(400-200*4)/2=-200, offsetY=(400-100*4)/2=0
      const result = transformBarcodeCoordinates(
        { x: 50, y: 25, width: 100, height: 50 },
        200,
        100,
        400,
        400,
        landscapeWindow
      )
      expect(result).toEqual({
        x: 50 * 4 - 200, // 0
        y: 25 * 4, // 100
        width: 100 * 4, // 400
        height: 50 * 4, // 200
      })
    })
  })

  describe('portrait device + iOS (axis swap)', () => {
    const portraitWindow = { width: 390, height: 844 }

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
    })

    it('swaps sensor axes for portrait display', () => {
      // Camera: 1000×500 landscape. Container: 500×1000 portrait.
      // frame: { x:250, y:125, w:500, h:250 } (center quarter of landscape frame)
      // normX=0.25, normY=0.25, normW=0.5, normH=0.5
      // fw=min(1000,500)=500, fh=max(1000,500)=1000
      // fx = (1 - 0.25 - 0.5)*500 = 125
      // fy = 0.25*1000 = 250
      // fWidth = 0.5*500 = 250
      // fHeight = 0.5*1000 = 500
      // scale = max(500/500, 1000/1000) = 1, offsets = 0
      const result = transformBarcodeCoordinates(
        { x: 250, y: 125, width: 500, height: 250 },
        1000,
        500,
        500,
        1000,
        portraitWindow
      )
      expect(result).toEqual({ x: 125, y: 250, width: 250, height: 500 })
    })

    it('maps a full-frame barcode to cover the full container', () => {
      // frame = full 1000×500, container = 500×1000
      // normX=0, normY=0, normW=1, normH=1
      // fx = (1-0-1)*500=0, fy=0, fWidth=500, fHeight=1000, scale=1
      const result = transformBarcodeCoordinates(
        { x: 0, y: 0, width: 1000, height: 500 },
        1000,
        500,
        500,
        1000,
        portraitWindow
      )
      expect(result).toEqual({ x: 0, y: 0, width: 500, height: 1000 })
    })
  })

  describe('portrait device + Android + landscape source frame (dimension swap)', () => {
    const portraitWindow = { width: 390, height: 844 }

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true })
    })

    it('swaps frame dimensions (not coordinates) to align with ML Kit portrait space', () => {
      // Camera reports 640×480 (landscape), but ML Kit bounding boxes are in portrait (480×640) space.
      // After swap: fw=480, fh=640. Container 480×640 → scale=1, offsets=0.
      const result = transformBarcodeCoordinates(
        { x: 100, y: 50, width: 200, height: 100 },
        640,
        480,
        480,
        640,
        portraitWindow
      )
      // Coordinates unchanged, only fw/fh swap enables correct scaling
      expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 })
    })

    it('does not swap dimensions when frame is already portrait', () => {
      // Camera frame is already portrait (480×640) — no swap needed
      const result = transformBarcodeCoordinates(
        { x: 100, y: 50, width: 200, height: 100 },
        480,
        640,
        480,
        640,
        portraitWindow
      )
      expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 })
    })

    it('produces different cover-scale results with vs without the dimension swap', () => {
      // Container 390×600, landscape frame 640×480
      // With swap:    fw=480, fh=640 → scale=max(390/480,600/640)=0.9375, offsetX=-30
      // Without swap: fw=640, fh=480 → scale=max(390/640,600/480)=1.25,  offsetX=-205
      const resultWithSwap = transformBarcodeCoordinates(
        { x: 100, y: 50, width: 100, height: 50 },
        640,
        480,
        390,
        600,
        portraitWindow
      )
      // With swap: scale=0.9375, offsetX=-30, offsetY=0
      expect(resultWithSwap.x).toBeCloseTo(100 * 0.9375 - 30) // 63.75
      expect(resultWithSwap.y).toBeCloseTo(50 * 0.9375) // 46.875
      expect(resultWithSwap.width).toBeCloseTo(100 * 0.9375) // 93.75
      expect(resultWithSwap.height).toBeCloseTo(50 * 0.9375) // 46.875
    })
  })
})

// ─── isCodeAlignedWithZones ───────────────────────────────────────────────────

describe('isCodeAlignedWithZones', () => {
  const container = { width: 400, height: 800 }

  // Zone: x=10%, y=30%, w=80%, h=10% → absolute {x:40,y:240,w:320,h:80}
  const scanZones: ScanZone[] = [{ types: ['code-39'], box: { x: 0.1, y: 0.3, width: 0.8, height: 0.1 } }]

  it('returns false when containerSize is null', () => {
    expect(isCodeAlignedWithZones({ x: 40, y: 240, width: 320, height: 80 }, 'code-39', null, scanZones, null)).toBe(
      false
    )
  })

  it('returns true when code is exactly within a matching scan zone', () => {
    expect(
      isCodeAlignedWithZones({ x: 40, y: 240, width: 320, height: 80 }, 'code-39', container, scanZones, null)
    ).toBe(true)
  })

  it('returns false when code is outside the scan zone', () => {
    expect(isCodeAlignedWithZones({ x: 0, y: 0, width: 100, height: 50 }, 'code-39', container, scanZones, null)).toBe(
      false
    )
  })

  it('returns false when code type does not match zone types', () => {
    expect(
      isCodeAlignedWithZones({ x: 40, y: 240, width: 320, height: 80 }, 'pdf-417', container, scanZones, null)
    ).toBe(false)
  })

  it('returns true when zone has no type restrictions', () => {
    const anyTypeZone: ScanZone[] = [{ types: [], box: { x: 0.1, y: 0.3, width: 0.8, height: 0.1 } }]
    expect(
      isCodeAlignedWithZones({ x: 40, y: 240, width: 320, height: 80 }, 'pdf-417', container, anyTypeZone, null)
    ).toBe(true)
  })

  it('returns true when code type is undefined and zone has type restrictions', () => {
    expect(
      isCodeAlignedWithZones({ x: 40, y: 240, width: 320, height: 80 }, undefined, container, scanZones, null)
    ).toBe(true)
  })

  it('uses marginFactor to allow codes slightly outside the zone boundary', () => {
    // Zone absolute: {x:40, y:240, w:320, h:80}. marginFactor=0.05 → marginX=16, marginY=4
    // Code at x=25 (15px left of zone start @40 — within 16px margin)
    expect(
      isCodeAlignedWithZones({ x: 25, y: 240, width: 320, height: 80 }, 'code-39', container, scanZones, null, 0.05)
    ).toBe(true)
  })

  it('returns false when code extends past margin', () => {
    // Code at x=20 (20px left of zone, but marginX=16) → outside
    expect(
      isCodeAlignedWithZones({ x: 20, y: 240, width: 320, height: 80 }, 'code-39', container, scanZones, null, 0.05)
    ).toBe(false)
  })

  describe('fallback to scanZoneBounds when no scanZones provided', () => {
    const bounds: Rect = { x: 50, y: 100, width: 300, height: 60 }

    it('returns false when scanZoneBounds is null', () => {
      expect(isCodeAlignedWithZones({ x: 50, y: 100, width: 300, height: 60 }, undefined, container, [], null)).toBe(
        false
      )
    })

    it('returns true when code is within scanZoneBounds', () => {
      expect(isCodeAlignedWithZones({ x: 50, y: 100, width: 300, height: 60 }, undefined, container, [], bounds)).toBe(
        true
      )
    })

    it('returns false when code is outside scanZoneBounds', () => {
      expect(isCodeAlignedWithZones({ x: 0, y: 0, width: 100, height: 50 }, undefined, container, [], bounds)).toBe(
        false
      )
    })
  })
})

// ─── determineScanState ────────────────────────────────────────────────────────

const makeCode = (value: string, isAligned: boolean, readingCount: number): EnhancedCode =>
  ({
    type: 'code-39',
    value,
    isAligned,
    readingCount,
  }) as unknown as EnhancedCode

const OPTIONS = { enableScanZones: false, minCodesForAligned: 2, lockReadingThreshold: 5 }

describe('determineScanState', () => {
  it('returns scanning when no codes are provided', () => {
    const { newScanState, qualifyingCodes } = determineScanState([], OPTIONS)
    expect(newScanState).toBe('scanning')
    expect(qualifyingCodes).toHaveLength(0)
  })

  it('returns scanning when there are fewer qualifying codes than minCodesForAligned', () => {
    const codes = [makeCode('ABC', true, 10)]
    const { newScanState } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('scanning')
  })

  it('returns scanning when codes have values but none are aligned (enableScanZones=false)', () => {
    const codes = [makeCode('ABC', false, 10), makeCode('DEF', false, 10)]
    const { newScanState } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('scanning')
  })

  it('returns aligned when enough qualifying codes are detected but readingCount is low', () => {
    const codes = [makeCode('ABC', true, 1), makeCode('DEF', true, 1)]
    const { newScanState, qualifyingCodes } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('aligned')
    expect(qualifyingCodes).toHaveLength(2)
  })

  it('returns locked when all qualifying codes meet the reading threshold', () => {
    const codes = [makeCode('ABC', true, 5), makeCode('DEF', true, 5)]
    const { newScanState, qualifyingCodes } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('locked')
    expect(qualifyingCodes).toHaveLength(2)
  })

  it('returns aligned (not locked) when only some codes meet the reading threshold', () => {
    const codes = [makeCode('ABC', true, 5), makeCode('DEF', true, 2)]
    const { newScanState } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('aligned')
  })

  it('excludes codes without a value from qualifying codes', () => {
    const codes = [
      makeCode('', true, 10), // no value — excluded
      makeCode('ABC', true, 10),
    ]
    const { newScanState } = determineScanState(codes, OPTIONS)
    expect(newScanState).toBe('scanning') // only 1 qualifying
  })

  describe('enableScanZones=true', () => {
    const devOptions = { ...OPTIONS, enableScanZones: true }

    it('counts unaligned codes as qualifying', () => {
      const codes = [makeCode('ABC', false, 5), makeCode('DEF', false, 5)]
      const { newScanState } = determineScanState(codes, devOptions)
      expect(newScanState).toBe('locked')
    })

    it('includes both aligned and unaligned codes in qualifying set', () => {
      const codes = [makeCode('ABC', false, 1), makeCode('DEF', true, 1)]
      const { newScanState, qualifyingCodes } = determineScanState(codes, devOptions)
      expect(newScanState).toBe('aligned')
      expect(qualifyingCodes).toHaveLength(2)
    })
  })

  it('respects a custom lockReadingThreshold', () => {
    const codes = [makeCode('ABC', true, 3), makeCode('DEF', true, 3)]
    const { newScanState } = determineScanState(codes, { ...OPTIONS, lockReadingThreshold: 3 })
    expect(newScanState).toBe('locked')
  })

  it('respects a custom minCodesForAligned', () => {
    const codes = [makeCode('ABC', true, 10)]
    const { newScanState } = determineScanState(codes, { ...OPTIONS, minCodesForAligned: 1 })
    expect(newScanState).toBe('locked')
  })
})
