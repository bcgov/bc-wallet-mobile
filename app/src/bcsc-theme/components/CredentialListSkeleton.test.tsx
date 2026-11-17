import { BCThemeNames } from '@/constants'
import { themes } from '@/theme'
import { SKELETON_FILL_COLOR } from '@bcwallet-theme/theme'
import { ThemeProvider } from '@bifold/core'
import { render } from '@testing-library/react-native'
import { Animated, StyleSheet } from 'react-native'
import { ReactTestRendererJSON } from 'react-test-renderer'
import CredentialListSkeleton, { getCredentialCardFrame } from './CredentialListSkeleton'

type SkeletonProps = { active?: boolean; theme?: string }

const Skeleton = ({ active, theme = BCThemeNames.Light }: SkeletonProps) => (
  <ThemeProvider themes={themes} defaultThemeName={theme}>
    <CredentialListSkeleton testID="skeleton" active={active} />
  </ThemeProvider>
)

const styleOf = (node: ReactTestRendererJSON) => StyleSheet.flatten(node.props.style) ?? {}
const childrenOf = (node: ReactTestRendererJSON) => (node.children ?? []) as ReactTestRendererJSON[]

/** Breaks the rendered skeleton into the parts the assertions name. */
const partsOf = (view: ReturnType<typeof render>) => {
  const container = view.toJSON() as ReactTestRendererJSON
  const [list] = childrenOf(container)
  const cards = childrenOf(list).map((card) => {
    const [fills, logoTile] = childrenOf(card)
    const [stripe, rows] = childrenOf(fills)
    return { card, fills, logoTile, stripe, rows: childrenOf(rows).map(childrenOf) }
  })
  return { container, list, cards }
}

describe('CredentialListSkeleton', () => {
  afterEach(() => jest.restoreAllMocks())

  it("sizes a card's frame like Bifold's credential card", () => {
    // The style guide draws the card for a 326-wide screen: 16 padding, a 40 stripe and logo, 108 minimum height.
    const frame = getCredentialCardFrame(326)

    expect(frame.padding).toBeCloseTo(16.3)
    expect(frame.logoSize).toBeCloseTo(39.12)
    expect(frame.minHeight).toBeCloseTo(107.58)
  })

  it('is one busy loading element for screen readers, with its blocks hidden from them', () => {
    const view = render(<Skeleton />)

    expect(view.getByRole('progressbar', { name: 'Global.Loading', busy: true })).toBe(view.getByTestId('skeleton'))
    const { list } = partsOf(view)
    expect(list.props.accessible).toBe(false)
    expect(list.props.importantForAccessibility).toBe('no-hide-descendants')
  })

  it('draws the two style guide cards: three label and value pairs, then one', () => {
    const { cards } = partsOf(render(<Skeleton />))

    expect(cards.map(({ rows }) => rows.length)).toEqual([3, 1])
    for (const { stripe, rows } of cards) {
      expect(styleOf(stripe).backgroundColor).toBe(SKELETON_FILL_COLOR)
      for (const [labelBar, valueBar] of rows) {
        expect(styleOf(labelBar)).toMatchObject({ height: 19, backgroundColor: SKELETON_FILL_COLOR })
        expect(styleOf(valueBar)).toMatchObject({ height: 24, backgroundColor: SKELETON_FILL_COLOR })
      }
    }
    expect(cards[0].rows.map(([labelBar, valueBar]) => [styleOf(labelBar).width, styleOf(valueBar).width])).toEqual([
      ['60%', '100%'],
      ['44%', '60%'],
      ['37%', '84%'],
    ])
  })

  it('pulses only the grey fills, so the card and its logo tile stay solid', () => {
    const { cards } = partsOf(render(<Skeleton />))

    for (const { card, fills, logoTile } of cards) {
      expect(styleOf(fills).opacity).toBe(1)
      expect(styleOf(fills).backgroundColor).toBeUndefined()
      expect(styleOf(card).opacity).toBeUndefined()
      expect(styleOf(logoTile).opacity).toBeUndefined()
    }
  })

  it.each([
    [BCThemeNames.Light, '#FFFFFF'],
    [BCThemeNames.Dark, '#013366'],
  ])('keeps the cards white on the %s page background', (theme, pageBackground) => {
    const { container, cards } = partsOf(render(<Skeleton theme={theme} />))

    expect(styleOf(container).backgroundColor).toBe(pageBackground)
    for (const { card, logoTile } of cards) {
      expect(styleOf(card).backgroundColor).toBe('#FFFFFF')
      expect(styleOf(logoTile).backgroundColor).toBe('#FFFFFF')
    }
  })

  it('does not pulse while inactive, stops when hidden, and can start again', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })

    const view = render(<Skeleton active={false} />)
    expect(loop).not.toHaveBeenCalled()
    view.rerender(<Skeleton active />)
    expect(start).toHaveBeenCalledTimes(1)
    view.rerender(<Skeleton active={false} />)
    expect(stop).toHaveBeenCalledTimes(1)
    view.rerender(<Skeleton active />)
    expect(start).toHaveBeenCalledTimes(2)
    view.unmount()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('loops a single native timing without blocking interactions, and keeps it across re-renders', () => {
    const start = jest.fn()
    const stop = jest.fn()
    const timing = jest.spyOn(Animated, 'timing')
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() })

    const view = render(<Skeleton />)

    expect(timing).toHaveBeenCalledTimes(1)
    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        isInteraction: false,
      })
    )
    expect(loop).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
    view.rerender(<Skeleton />)
    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()

    view.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('matches the style guide layout', () => {
    expect(render(<Skeleton />).toJSON()).toMatchSnapshot()
  })
})
