import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { ContentShadow } from './ContentShadow'

describe('ContentShadow Component', () => {
  test('renders correctly with defaults', () => {
    const tree = render(
      <BasicAppContext>
        <ContentShadow />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  test('renders correctly with custom colour, opacity and height', () => {
    const tree = render(
      <BasicAppContext>
        <ContentShadow color="#123456" opacity={0.3} height={20} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
