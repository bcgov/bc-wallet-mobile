import enTranslation from '@/localization/en'
import frTranslation from '@/localization/fr'
import ptBrTranslation from '@/localization/pt-br'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import { get } from 'lodash'
import React from 'react'
import { Platform } from 'react-native'
import { PermissionDisabled, PermissionType } from './PermissionDisabled'

describe('PermissionDisabled', () => {
  const permissionTypes: PermissionType[] = [
    'camera',
    'microphone',
    'notifications',
    'cameraAndMicrophone',
    'bluetooth',
  ]
  const locales = { en: enTranslation, fr: frTranslation, 'pt-br': ptBrTranslation }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe.each(['ios', 'android'] as const)('on %s', (os) => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', os)
    })

    it.each(permissionTypes)('renders %s with a title, description and steps that exist in every locale', (type) => {
      const { queryAllByText, getByText } = render(
        <BasicAppContext>
          <PermissionDisabled permissionType={type} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.PermissionDisabled.OpenSettings')).toBeTruthy()

      // The test i18n renders translation keys, so every rendered key must resolve in each locale file
      const renderedKeys = queryAllByText(/^BCSC\.PermissionDisabled\./).map((node) => String(node.props.children))
      const contentKeys = renderedKeys.filter((key) => key !== 'BCSC.PermissionDisabled.OpenSettings')

      // title + description + at least three steps
      expect(contentKeys.length).toBeGreaterThanOrEqual(5)

      Object.entries(locales).forEach(([locale, translation]) => {
        contentKeys.forEach((key) => {
          expect({ locale, key, value: get(translation, key) }).toEqual({
            locale,
            key,
            value: expect.any(String),
          })
        })
      })
    })
  })

  it('renders the bluetooth content keys', () => {
    const { getByText } = render(
      <BasicAppContext>
        <PermissionDisabled permissionType="bluetooth" />
      </BasicAppContext>
    )

    expect(getByText('BCSC.PermissionDisabled.BluetoothTitle')).toBeTruthy()
    expect(getByText('BCSC.PermissionDisabled.BluetoothDescription')).toBeTruthy()
  })
})
