import { BasicAppContext } from '@mocks/helpers/app'
import { render, screen } from '@testing-library/react-native'
import React from 'react'
import FloatingHelpMenu from './FloatingHelpMenu'

// The global react-i18next mock returns raw keys, so interpolate locally to assert version/build.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key !== 'BCSC.HelpMenu.Version') {
        return key
      }
      return 'App version: {{ version }} ({{ build }})'
        .replace('{{ version }}', options?.version ?? '')
        .replace('{{ build }}', options?.build ?? '')
    },
  }),
}))

describe('FloatingHelpMenu', () => {
  it('renders the app version with the build number', () => {
    render(
      <BasicAppContext>
        <FloatingHelpMenu open onClose={jest.fn()} />
      </BasicAppContext>
    )

    // '4.0.0' and '142' come from the react-native-device-info jest mock.
    expect(screen.getByText('App version: 4.0.0 (142)')).toBeTruthy()
  })
})
