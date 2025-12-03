import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import {ServiceLoginScreen} from '../../src/bcsc-theme/features/services/ServiceLoginScreen'



describe('ServiceLogin', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const route = { params: { serviceClient: { client_id: 'test-client' } } }
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
