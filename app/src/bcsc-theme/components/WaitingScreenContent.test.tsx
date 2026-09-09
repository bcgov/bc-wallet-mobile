import { BCThemeNames } from '@/constants'
import { themes } from '@/theme'
import { testIdWithKey, ThemeProvider } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import { WaitingScreenContent } from './WaitingScreenContent'

jest.mock('./BCAnimatedLoadingIcon', () => ({ BCAnimatedLoadingIcon: () => null }))

describe('WaitingScreenContent', () => {
  it('reveals a loader without progress after measuring only the viewport', () => {
    const view = render(<WaitingScreenContent message="Loading data" />)
    const viewport = view.getByTestId(testIdWithKey('WaitingScreenContentViewport'))
    expect(viewport).toHaveStyle({ opacity: 0 })
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(view.queryByTestId(testIdWithKey('WaitingScreenContentStatus'))).toBeNull()
    fireEvent(viewport, 'layout', { nativeEvent: { layout: { height: 800 } } })
    expect(viewport).toHaveStyle({ opacity: 1 })
    expect(view.getByText('Loading data')).toBeTruthy()
  })

  it('renders zero progress and waits for both measurements before revealing it', () => {
    const view = render(<WaitingScreenContent message="Preparing" progressPercent={0} />)
    const viewport = view.getByTestId(testIdWithKey('WaitingScreenContentViewport'))
    const status = view.getByTestId(testIdWithKey('WaitingScreenContentStatus'))
    expect(view.getByRole('progressbar', { name: 'Init.Starting' })).toBeTruthy()
    fireEvent(viewport, 'layout', { nativeEvent: { layout: { height: 800 } } })
    expect(viewport).toHaveStyle({ opacity: 0 })
    fireEvent(status, 'layout', { nativeEvent: { layout: { height: 43 } } })
    expect(viewport).toHaveStyle({ opacity: 1 })

    view.rerender(<WaitingScreenContent message="Preparing" />)
    expect(viewport).toHaveStyle({ opacity: 1 })
    expect(view.queryByRole('progressbar')).toBeNull()
  })

  it.each([BCThemeNames.Light, BCThemeNames.Dark])('renders the themed 8-point bar in %s', (theme) => {
    const view = render(
      <ThemeProvider themes={themes} defaultThemeName={theme}>
        <WaitingScreenContent message="Preparing" statusMessage="Loading account" progressPercent={50} />
      </ThemeProvider>
    )
    expect(view.getByRole('progressbar', { name: 'Loading account' })).toBeTruthy()
    expect(view.toJSON()).toMatchSnapshot()
    expect(view.getByText('Preparing')).toHaveStyle({
      color: theme === BCThemeNames.Light ? '#013366' : '#FCBA19',
    })
    expect(view.getByText('Loading account')).toHaveStyle({
      color: theme === BCThemeNames.Light ? '#474543' : '#FFFFFF',
    })
  })
})
