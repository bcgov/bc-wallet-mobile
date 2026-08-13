import { BasicAppContext } from '@mocks/helpers/app'
import { render, screen } from '@testing-library/react-native'
import React from 'react'
import FloatingHelpMenu from './FloatingHelpMenu'

// The global react-i18next mock (see app/__mocks__/react-i18next.ts) drops interpolation
// values and returns the raw key, which would hide a regression in the version/build
// interpolation this test is meant to catch. Override locally with a mock that actually
// interpolates the `version`/`build` options into the real Version copy.
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

    // react-native-device-info mock (__mocks__/react-native-device-info.ts) fixes
    // getVersion() to '4.0.0' and getBuildNumber() to '142'.
    expect(screen.getByText('App version: 4.0.0 (142)')).toBeTruthy()
  })
})
