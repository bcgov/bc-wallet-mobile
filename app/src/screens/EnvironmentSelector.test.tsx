import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import { IASEnvironment } from '@utils/environment'
import React from 'react'
import EnvironmentSelector from './EnvironmentSelector'

const environments = Object.values(IASEnvironment)

const renderSelector = () => {
  const onEnvironmentChange = jest.fn().mockResolvedValue(undefined)
  const onCancel = jest.fn()

  const screen = render(
    <BasicAppContext>
      <EnvironmentSelector onEnvironmentChange={onEnvironmentChange} onCancel={onCancel} />
    </BasicAppContext>
  )

  return { ...screen, onEnvironmentChange, onCancel }
}

describe('EnvironmentSelector', () => {
  it('lists every IAS environment', () => {
    const { getByText } = renderSelector()

    environments.forEach((environment) => {
      expect(getByText(environment.name.toUpperCase())).toBeTruthy()
    })
  })

  it.each(environments.map((environment) => [environment.name, environment] as const))(
    'reports the %s environment when its row is selected',
    async (_name, environment) => {
      const { getByTestId, onEnvironmentChange } = renderSelector()

      await act(async () => {
        fireEvent.press(getByTestId(testIdWithKey(environment.name.toLocaleLowerCase())))
      })

      expect(onEnvironmentChange).toHaveBeenCalledWith(environment)
    }
  )

  it('cancels without changing the environment', async () => {
    const { getByTestId, onCancel, onEnvironmentChange } = renderSelector()

    await act(async () => {
      fireEvent.press(getByTestId(testIdWithKey('Cancel')))
    })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onEnvironmentChange).not.toHaveBeenCalled()
  })
})
