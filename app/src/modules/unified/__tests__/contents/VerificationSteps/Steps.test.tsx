import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import VerificationStepsContent from '../../../contents/VerificationSteps/Steps'
import { testIdWithKey } from '@hyperledger/aries-bifold-core'

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
      <VerificationStepsContent
        goToEvidenceCollectionStep={goToEvidenceCollectionStep}
        goToResidentialAddressStep={goToResidentialAddressStep}
        goToEmailStep={goToEmailStep}
        goToVerifyIdentityStep={goToVerifyIdentityStep}
      />
    )
    expect(tree).toMatchSnapshot()
  })

  test('Step1 test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <VerificationStepsContent
        goToEvidenceCollectionStep={goToEvidenceCollectionStep}
        goToResidentialAddressStep={goToResidentialAddressStep}
        goToEmailStep={goToEmailStep}
        goToVerifyIdentityStep={goToVerifyIdentityStep}
      />
    )

    const step1Button = getByTestId(testIdWithKey('Step1'))
    expect(step1Button).toBeDefined()
    fireEvent(step1Button, 'press')
    expect(goToEvidenceCollectionStep).toHaveBeenCalledTimes(1)
  })
})
