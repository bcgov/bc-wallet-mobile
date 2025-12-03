import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import {VerifyWebViewScreen} from '../../src/bcsc-theme/features/webview/VerifyWebViewScreen'

describe('VerifyWebView', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const route = { params: { url: 'https://example.com', title: 'Test' } }
    const tree = render(
      <BasicAppContext>
        <VerifyWebViewScreen route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
