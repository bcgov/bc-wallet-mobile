import { ThemedText } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Callout } from './Callout'

describe('Callout Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <Callout>
          <ThemedText>Callout content</ThemedText>
        </Callout>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
