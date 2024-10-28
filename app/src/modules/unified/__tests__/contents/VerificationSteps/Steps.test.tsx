import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import VerificationStepsContent from '../../../contents/VerificationSteps/Steps'
import { testIdWithKey } from '@hyperledger/aries-bifold-core'

describe('VerificationStepsContent Component', () => {
  const goToStep1 = jest.fn()
  const goToStep2 = jest.fn()
  const goToStep3 = jest.fn()
  const goToStep4 = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <VerificationStepsContent
        goToStep1={goToStep1}
        goToStep2={goToStep2}
        goToStep3={goToStep3}
        goToStep4={goToStep4}
      />
    )
    expect(tree).toMatchSnapshot()
  })

  test('Step1 test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <VerificationStepsContent
        goToStep1={goToStep1}
        goToStep2={goToStep2}
        goToStep3={goToStep3}
        goToStep4={goToStep4}
      />
    )

    const step1Button = getByTestId(testIdWithKey('Step1'))
    expect(step1Button).toBeDefined()
    fireEvent(step1Button, 'press')
    expect(goToStep1).toHaveBeenCalledTimes(1)
  })
})
