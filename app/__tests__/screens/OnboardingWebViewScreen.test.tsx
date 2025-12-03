import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import {OnboardingWebViewScreen} from '../../src/bcsc-theme/features/webview/OnboardingWebViewScreen'



describe('OnboardingWebView', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const route = { key: 'onboarding-webview', name: 'OnboardingWebView', params: { url: 'https://example.com', title: 'Test' } } as any
    const tree = render(
      <BasicAppContext>
        <OnboardingWebViewScreen route={route}/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
