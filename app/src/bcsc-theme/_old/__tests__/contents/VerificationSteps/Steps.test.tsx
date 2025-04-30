import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import VerificationStepsContent from '../../../contents/VerificationSteps/Steps'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '../../../../../../__mocks__/helpers/app'

describe('VerificationStepsContent Component', () => {
  const goToEvidenceCollectionStep = jest.fn()
  const goToResidentialAddressStep = jest.fn()
  const goToEmailStep = jest.fn()
  const goToVerifyIdentityStep = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <VerificationStepsContent
          goToEvidenceCollectionStep={goToEvidenceCollectionStep}
          goToResidentialAddressStep={goToResidentialAddressStep}
          goToEmailStep={goToEmailStep}
          goToVerifyIdentityStep={goToVerifyIdentityStep}
        />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('Step1 test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <VerificationStepsContent
          goToEvidenceCollectionStep={goToEvidenceCollectionStep}
          goToResidentialAddressStep={goToResidentialAddressStep}
          goToEmailStep={goToEmailStep}
          goToVerifyIdentityStep={goToVerifyIdentityStep}
        />
      </BasicAppContext>
    )

    const step1Button = getByTestId(testIdWithKey('Step1'))
    expect(step1Button).toBeDefined()
    fireEvent(step1Button, 'press')
    expect(goToEvidenceCollectionStep).toHaveBeenCalledTimes(1)
  })
})
