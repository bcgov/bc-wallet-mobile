import { testIdWithKey } from '@bifold/core'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { act } from 'react-test-renderer'

import * as environmentUtils from '@/bcsc-theme/utils/environment-utils'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import IASApiBaseUrlScreen from '../../src/screens/IASApiBaseUrl'
import { iasBaseApiUrls } from '../../src/store'

jest.mock('@/bcsc-theme/utils/environment-utils', () => ({
  prepareEnvironmentSwitch: jest.fn().mockResolvedValue(undefined),
}))

const mockShouldDismissModal = jest.fn()

describe('IASApiBaseUrl Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('screen renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <IASApiBaseUrlScreen shouldDismissModal={mockShouldDismissModal} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('Save button calls handleSave function', async () => {
    const prepareEnvironmentSwitch = jest.spyOn(environmentUtils, 'prepareEnvironmentSwitch')

    const { getByTestId } = render(
      <BasicAppContext>
        <IASApiBaseUrlScreen shouldDismissModal={mockShouldDismissModal} />
      </BasicAppContext>
    )

    // Select a different URL first to enable the Save button
    const urlButton = getByTestId(testIdWithKey(`IASApiBaseUrl-${iasBaseApiUrls.DEV}`))
    act(() => {
      fireEvent.press(urlButton)
    })

    const saveButton = getByTestId(testIdWithKey('SaveIASApiBaseUrl'))
    act(() => {
      fireEvent.press(saveButton)
    })

    await waitFor(() => {
      expect(prepareEnvironmentSwitch).toHaveBeenCalled()
      expect(mockShouldDismissModal).toHaveBeenCalled()
    })
  })

  test('Cancel button calls handleCancel function', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <IASApiBaseUrlScreen shouldDismissModal={mockShouldDismissModal} />
      </BasicAppContext>
    )

    const cancelButton = getByTestId(testIdWithKey('CancelIASApiBaseUrl'))
    act(() => {
      fireEvent.press(cancelButton)
    })

    expect(mockShouldDismissModal).toHaveBeenCalled()
  })

  test('URL selection button calls handleUrlSelect function', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <IASApiBaseUrlScreen shouldDismissModal={mockShouldDismissModal} />
      </BasicAppContext>
    )

    const urlButton = getByTestId(testIdWithKey(`IASApiBaseUrl-${iasBaseApiUrls.DEV}`))
    act(() => {
      fireEvent.press(urlButton)
    })

    // After selecting, the Save button should be enabled
    const saveButton = getByTestId(testIdWithKey('SaveIASApiBaseUrl'))
    expect(saveButton.props.accessibilityState.disabled).toBe(false)
  })
})
