/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet, Text } from 'react-native'

import { ListButton, ListButtonGroup } from './ListButton'

jest.mock('@bifold/core', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const ReactInFactory = require('react')
  return {
    ThemedText: ({ children, style }: any) => ReactInFactory.createElement('Text', { style }, children),
    useTheme: () => ({
      Spacing: { xs: 4, sm: 8, md: 16 },
      ColorPalette: { brand: { tertiaryBackground: '#D8EAFD', headerText: '#1E5189' } },
    }),
  }
})

// Resolve the (possibly function) style prop on the element with the given testID
// into a flat style object so border-radius assertions can be made.
const flatStyleOf = (testID: string): any => {
  const el = screen.getByTestId(testID)
  const styleProp: any = el.props.style
  const resolved = typeof styleProp === 'function' ? styleProp({ pressed: false }) : styleProp
  return StyleSheet.flatten(resolved)
}

describe('ListButton', () => {
  it('wraps a string child in ThemedText and derives a non-breaking accessibility label', () => {
    render(
      <ListButton onPress={jest.fn()} testID="id/str">
        Edit Contact Name
      </ListButton>
    )
    expect(screen.getByText('Edit Contact Name')).toBeTruthy()
    // Spaces are replaced with non-breaking spaces by a11yLabel().
    expect(screen.getByTestId('id/str').props.accessibilityLabel).toBe('Edit Contact Name')
  })

  it('uses an explicit accessibility label verbatim (no transformation)', () => {
    render(
      <ListButton onPress={jest.fn()} testID="id/explicit" accessibilityLabel="Custom Label">
        <Text>content</Text>
      </ListButton>
    )
    expect(screen.getByTestId('id/explicit').props.accessibilityLabel).toBe('Custom Label')
  })

  it('derives no accessibility label for non-string children without an explicit label', () => {
    render(
      <ListButton onPress={jest.fn()} testID="id/node">
        <Text>content</Text>
      </ListButton>
    )
    expect(screen.getByTestId('id/node').props.accessibilityLabel).toBeUndefined()
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('fires onPress when pressed', () => {
    const onPress = jest.fn()
    render(
      <ListButton onPress={onPress} testID="id/press">
        Press me
      </ListButton>
    )
    fireEvent.press(screen.getByTestId('id/press'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['only', { borderRadius: 8 }],
    ['first', { borderTopLeftRadius: 8, borderTopRightRadius: 8 }],
    ['last', { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }],
    ['middle', { borderRadius: 0 }],
  ] as const)('applies the %s border radius', (position, expected) => {
    render(
      <ListButton onPress={jest.fn()} testID="id/radius" position={position as any}>
        Row
      </ListButton>
    )
    expect(flatStyleOf('id/radius')).toMatchObject(expected)
  })
})

describe('ListButtonGroup', () => {
  it('injects only-position border radius for a single child', () => {
    render(
      <ListButtonGroup>
        <ListButton onPress={jest.fn()} testID="id/solo">
          Solo
        </ListButton>
      </ListButtonGroup>
    )
    expect(flatStyleOf('id/solo')).toMatchObject({ borderRadius: 8 })
  })

  it('injects first / middle / last positions across multiple children', () => {
    render(
      <ListButtonGroup>
        <ListButton onPress={jest.fn()} testID="id/a">
          A
        </ListButton>
        <ListButton onPress={jest.fn()} testID="id/b">
          B
        </ListButton>
        <ListButton onPress={jest.fn()} testID="id/c">
          C
        </ListButton>
      </ListButtonGroup>
    )
    expect(flatStyleOf('id/a')).toMatchObject({ borderTopLeftRadius: 8, borderTopRightRadius: 8 })
    expect(flatStyleOf('id/b')).toMatchObject({ borderRadius: 0 })
    expect(flatStyleOf('id/c')).toMatchObject({ borderBottomLeftRadius: 8, borderBottomRightRadius: 8 })
  })

  it('filters out falsy children before assigning positions', () => {
    render(
      <ListButtonGroup>
        {[
          <ListButton key="a" onPress={jest.fn()} testID="id/first">
            First
          </ListButton>,
          null,
          <ListButton key="b" onPress={jest.fn()} testID="id/second">
            Second
          </ListButton>,
        ]}
      </ListButtonGroup>
    )
    // With the null dropped, the two survivors are treated as first + last.
    expect(flatStyleOf('id/first')).toMatchObject({ borderTopLeftRadius: 8, borderTopRightRadius: 8 })
    expect(flatStyleOf('id/second')).toMatchObject({ borderBottomLeftRadius: 8, borderBottomRightRadius: 8 })
  })
})
