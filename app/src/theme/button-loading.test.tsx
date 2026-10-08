import { BCThemeNames } from '@/constants'
import { TESTID_PREFIX } from '@/test-ids/registry'
import { themes } from '@/theme'
import { animatedComponents, Button, ButtonType, ITheme, ThemeProvider, useTheme } from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { ReactTestRendererJSON } from 'react-test-renderer'

// Bifold's own ids, not app keys: ButtonLoading wraps LoadingSpinner, whose icon is `Loading`.
const SPINNER_ICON_ID = `${TESTID_PREFIX}Loading`
const SPINNER_WRAPPER_ID = `${TESTID_PREFIX}ButtonLoading`
const TITLE = 'Check again'

const { ButtonLoading } = animatedComponents

let currentTheme: ITheme

const CaptureTheme = () => {
  currentTheme = useTheme()
  return null
}

const withTheme = (themeName: string, children: React.ReactNode) => (
  <ThemeProvider themes={themes} defaultThemeName={themeName}>
    <CaptureTheme />
    {children}
  </ThemeProvider>
)

const loadingButton = (buttonType: ButtonType, disabled: boolean) => (
  <Button title={TITLE} buttonType={buttonType} onPress={jest.fn()} disabled={disabled}>
    <ButtonLoading />
  </Button>
)

const renderButton = (themeName: string, buttonType: ButtonType, disabled: boolean) => {
  const view = render(withTheme(themeName, loadingButton(buttonType, disabled)))
  return {
    ...view,
    rerenderButton: (nextDisabled: boolean) =>
      view.rerender(withTheme(themeName, loadingButton(buttonType, nextDisabled))),
  }
}

type HostNode = ReactTestRendererJSON

const isHost = (node: HostNode | string): node is HostNode => typeof node !== 'string'

const findParentOf = (node: HostNode, testID: string): HostNode | undefined => {
  const children = (node.children ?? []).filter(isHost)
  if (children.some((child) => child.props.testID === testID)) {
    return node
  }
  return children.map((child) => findParentOf(child, testID)).find(Boolean)
}

const spinnerColor = (view: ReturnType<typeof render>) =>
  StyleSheet.flatten(view.getByTestId(SPINNER_ICON_ID).props.style).color

const labelColor = (view: ReturnType<typeof render>) => StyleSheet.flatten(view.getByText(TITLE).props.style).color

describe('ButtonLoading inside a Button', () => {
  it('matches the white label of a disabled Primary button in the Light theme', () => {
    const view = renderButton(BCThemeNames.Light, ButtonType.Primary, true)

    expect(labelColor(view)).toBe('#FFFFFF')
    expect(spinnerColor(view)).toBe(labelColor(view))
    expect(spinnerColor(view)).not.toBe(currentTheme.ColorPalette.brand.icon)
  })

  it('matches the label of an enabled Primary button in the Light theme', () => {
    const view = renderButton(BCThemeNames.Light, ButtonType.Primary, false)

    expect(spinnerColor(view)).toBe(labelColor(view))
  })

  it('matches the label of a disabled Critical button in the Light theme', () => {
    const view = renderButton(BCThemeNames.Light, ButtonType.Critical, true)

    expect(spinnerColor(view)).toBe(labelColor(view))
  })

  it('matches the label of a Secondary button in the BC Wallet theme', () => {
    const view = renderButton(BCThemeNames.BCWallet, ButtonType.Secondary, false)

    expect(labelColor(view)).toBe('#003366')
    expect(spinnerColor(view)).toBe(labelColor(view))
  })

  it('matches the label of a Primary button in the Dark theme', () => {
    const view = renderButton(BCThemeNames.Dark, ButtonType.Primary, true)

    expect(spinnerColor(view)).toBe(labelColor(view))
  })

  it('follows a Secondary label as it goes disabled and back in the Light theme', () => {
    const view = renderButton(BCThemeNames.Light, ButtonType.Secondary, false)
    const enabledColor = labelColor(view)
    expect(spinnerColor(view)).toBe(enabledColor)

    view.rerenderButton(true)
    const disabledColor = labelColor(view)
    expect(disabledColor).not.toBe(enabledColor)
    expect(spinnerColor(view)).toBe(disabledColor)

    view.rerenderButton(false)
    expect(labelColor(view)).toBe(enabledColor)
    expect(spinnerColor(view)).toBe(enabledColor)
  })

  it('is 24px and sits left of the label with Spacing.sm between them', () => {
    const view = renderButton(BCThemeNames.Light, ButtonType.Primary, true)

    expect(StyleSheet.flatten(view.getByTestId(SPINNER_ICON_ID).props.style).fontSize).toBe(24)
    expect(StyleSheet.flatten(view.getByTestId(SPINNER_WRAPPER_ID).props.style).marginRight).toBe(
      currentTheme.Spacing.sm
    )

    const tree = view.toJSON() as HostNode
    const row = findParentOf(tree, SPINNER_WRAPPER_ID)
    const order = row?.children?.map((child) =>
      isHost(child) && child.props.testID === SPINNER_WRAPPER_ID ? 'spinner' : 'label'
    )
    expect(order).toEqual(['spinner', 'label'])
  })

  it('falls back to the brand icon colour outside a Button', () => {
    const view = render(
      withTheme(
        BCThemeNames.Light,
        <View>
          <ButtonLoading />
        </View>
      )
    )

    expect(spinnerColor(view)).toBe(currentTheme.ColorPalette.brand.icon)
  })
})
