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
    const mockEvidenceType = {
      evidence_type: 'passport',
      has_photo: true,
      group: 'OTHER COUNTRIES' as const,
      group_sort_order: 1,
      sort_order: 1,
      collection_order: 'FIRST' as const,
      document_reference_input_mask: '[0-9]{9}',
      document_reference_label: 'Passport Number',
      document_reference_sample: '123456789',
      image_sides: [
        {
          side: 'FRONT',
          label: 'Front of Passport',
        },
      ],
      evidence_type_label: 'Passport',
    }

    const tree = render(
      <BasicAppContext>
        <EvidenceCaptureScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    // Wait for useFocusEffect to complete and camera to be rendered
    await waitFor(async () => {
      expect(tree.queryAllByText('BCSC.CameraDisclosure.NoCameraAvailable')).toBeDefined()
    })

    expect(tree).toMatchSnapshot()
  })

  it('renders nothing when no current side to capture', async () => {
    const tree = render(
      <BasicAppContext>
        <EvidenceCaptureScreen
          navigation={mockNavigation as never}
          route={
            {
              params: {
                cardType: {
                  image_sides: [],
                },
              },
            } as never
          }
        />
      </BasicAppContext>
    )

    await waitFor(() => {
      const testId = tree.queryByTestId(testIdWithKey('EvidenceCaptureScreenMaskedCamera'))
      const photoReviewId = tree.queryByTestId(testIdWithKey('RetakePhoto'))
      expect(testId).toBeNull()
      expect(photoReviewId).toBeNull()
    })
  })

  it('renders loading screen when permissions are loading', async () => {
    jest.spyOn(AutoRequestPermissionHook, 'useAutoRequestPermission').mockReturnValue({ isLoading: true })

    const tree = render(
      <BasicAppContext>
        <EvidenceCaptureScreen
          navigation={mockNavigation as never}
          route={
            {
              params: {
                cardType: {
                  image_sides: [
                    {
                      side: 'FRONT',
                      label: 'Front of Passport',
                    },
                  ],
                },
              },
            } as never
          }
        />
      </BasicAppContext>
    )

    await waitFor(() => {
      const testId = tree.getByTestId(testIdWithKey('LoadingScreenContent'))
      expect(testId).toBeDefined()
    })
  })
})
