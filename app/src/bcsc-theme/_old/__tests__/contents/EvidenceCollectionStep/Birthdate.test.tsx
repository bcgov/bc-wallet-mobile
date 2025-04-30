import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../../../../../__mocks__/helpers/app'
import BirthdateContent from '../../../contents/EvidenceCollectionStep/Birthdate'

describe('BirthdateContent Component', () => {
  const onComplete = jest.fn()

  beforeAll(() => {
    jest.useFakeTimers()
    // Set the date to 20 Oct 2024 00:12:00 GMT so snapshots don't change
    jest.setSystemTime(new Date('20 Oct 2024 00:12:00 GMT').getTime())
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BirthdateContent onComplete={onComplete} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('Done test ID is present and press handler works', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <BirthdateContent onComplete={onComplete} />
      </BasicAppContext>
    )

    const doneButton = getByTestId(testIdWithKey('Done'))
    expect(doneButton).toBeDefined()
    fireEvent(doneButton, 'press')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
