import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import SuccessfullySentScreen from './SuccessfullySentScreen'

describe('SuccessfullySent', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Note: the turnaround-sentence composition and the "reviewed by" date both run through i18n
  // interpolation, which the react-i18next test mock returns as the raw key — so those strings are
  // exercised via the flow (useEvidenceUploadModel forwards the API turnaround as a route param) and
  // by typecheck, not asserted here.
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <SuccessfullySentScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
