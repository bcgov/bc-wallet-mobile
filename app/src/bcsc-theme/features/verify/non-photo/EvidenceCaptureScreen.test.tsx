import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as AutoRequestPermissionHook from '@/hooks/useAutoRequestPermission'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import EvidenceCaptureScreen from './EvidenceCaptureScreen'

describe('EvidenceCapture', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', async () => {
    const tree = render(
      <BasicAppContext>
        <EvidenceCaptureScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    // Wait for useFocusEffect to complete and camera to be rendered
    await waitFor(async () => {
      expect(tree.queryAllByText('BCSC.CameraDisclosure.NoCameraAvailable')).toBeDefined()
    })

    expect(tree).toMatchSnapshot()
  })

  it('renders loading screen when permissions are loading', async () => {
    jest.spyOn(AutoRequestPermissionHook, 'useAutoRequestPermission').mockReturnValue({ isLoading: true })

    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <EvidenceCaptureScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    await waitFor(() => {
      const testId = tree.getByTestId(testIdWithKey('LoadingScreenContent'))
      expect(testId).toBeDefined()
    })
  })
})
