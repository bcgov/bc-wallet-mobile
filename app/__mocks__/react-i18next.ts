import React from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reactI18Next: any = jest.createMockFromModule('react-i18next')

reactI18Next.useTranslation = () => {
  return {
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
      t: (str: string) => str,
    },
  }
}

reactI18Next.Trans = ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => {
  return React.createElement('span', {}, children || i18nKey || '')
}
reactI18Next.Trans.displayName = 'Trans'

reactI18Next.initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
}

module.exports = reactI18Next

export default {}
