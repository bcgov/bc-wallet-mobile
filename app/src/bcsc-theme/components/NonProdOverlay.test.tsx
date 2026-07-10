import { Developer } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import { IASEnvironment } from '@utils/environment'
import React from 'react'
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
