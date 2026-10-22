import { renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { usePhotoOutput } from 'react-native-vision-camera'

import { useEvidencePhotoOutput, useSelfiePhotoOutput } from './camera-output'

describe('photo outputs', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.mocked(usePhotoOutput).mockClear()
  })

  // Android uses MINIMIZE_LATENCY ('balanced'), as v4 and ias-android did; iOS keeps its own settings
  it.each([
    ['android', 'balanced', 'balanced'],
    ['ios', 'speed', 'quality'],
  ])('on %s, evidence photos use %s and selfies use %s', (os, evidence, selfie) => {
    // Jest's react-native mock always selects iOS, so select for the platform under test
    jest
      .spyOn(Platform, 'select')
      .mockImplementation((specifics: Record<string, unknown>) => (os in specifics ? specifics[os] : specifics.default))

    renderHook(() => useEvidencePhotoOutput())
    renderHook(() => useSelfiePhotoOutput())

    expect(usePhotoOutput).toHaveBeenNthCalledWith(1, expect.objectContaining({ qualityPrioritization: evidence }))
    expect(usePhotoOutput).toHaveBeenNthCalledWith(2, expect.objectContaining({ qualityPrioritization: selfie }))
  })
})
