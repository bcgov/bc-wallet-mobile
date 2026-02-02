import { render } from '@testing-library/react-native'
import React from 'react'

import { Developer, IASEnvironment } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import NonProdOverlay from './NonProdOverlay'

describe('NonProdOverlay Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <NonProdOverlay />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })

  test('renders correctly with SIT environment', () => {
    const tree = render(
      <BasicAppContext initialStateOverride={{ developer: { environment: IASEnvironment.SIT } as Developer }}>
        <NonProdOverlay />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
