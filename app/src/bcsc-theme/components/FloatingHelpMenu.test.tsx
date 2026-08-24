import en from '@/localization/en'
import fr from '@/localization/fr'
import ptBr from '@/localization/pt-br'
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

  // The mock above hardcodes its template, so it can't catch a regression in the shipped
  // locale copy; assert against the real locale resources so a dropped `{{ build }}` fails.
  it('keeps the build placeholder in the shipped locale strings', () => {
    expect(en.BCSC.HelpMenu.Version).toContain('{{ version }}')
    expect(en.BCSC.HelpMenu.Version).toContain('{{ build }}')
    expect(fr.BCSC.HelpMenu.Version).toContain('{{ build }}')
    expect(ptBr.BCSC.HelpMenu.Version).toContain('{{ build }}')
  })
})
