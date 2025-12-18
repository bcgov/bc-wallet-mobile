import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import EvidenceCaptureScreen from '../../src/bcsc-theme/features/verify/non-photo/EvidenceCaptureScreen'

describe('EvidenceCapture', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
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
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
