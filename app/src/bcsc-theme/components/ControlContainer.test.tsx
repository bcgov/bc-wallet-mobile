import { ThemedText } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { ControlContainer } from './ControlContainer'

describe('ControlContainer Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ControlContainer>
          <ThemedText>Control content</ThemedText>
        </ControlContainer>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
