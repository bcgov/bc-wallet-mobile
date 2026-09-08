import ProgressBar from '@/components/ProgressBar'
import { BCThemeNames } from '@/constants'
import { themes } from '@/theme'
import { testIdWithKey, ThemeProvider } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import { PropsWithChildren } from 'react'
import { StartupLoadingScreenContent } from './StartupLoadingScreenContent'

jest.mock('@/components/ProgressBar', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('./BCAnimatedLoadingIcon', () => ({ BCAnimatedLoadingIcon: () => null }))

const LightThemeProvider = ({ children }: PropsWithChildren) => (
  <ThemeProvider themes={themes} defaultThemeName={BCThemeNames.Light}>
    {children}
  </ThemeProvider>
)

describe('StartupLoadingScreenContent', () => {
  beforeEach(() => jest.mocked(ProgressBar).mockClear())

  it('renders the startup copy and fixed progress stage', () => {
    const view = render(<StartupLoadingScreenContent />, { wrapper: LightThemeProvider })

    expect(view.getByText('BCSC.Loading.AppStartup')).toBeTruthy()
    expect(view.getByText('Init.Starting')).toBeTruthy()
    expect(jest.mocked(ProgressBar)).toHaveBeenCalledWith(
      expect.objectContaining({
        progressPercent: (2 / 3) * 100,
        trackColor: '#FAF9F8',
        progressColor: '#F8BA47',
      }),
      undefined
    )
  })

  it('uses supplied copy and keeps the content hidden until its layout is measured', () => {
    const view = render(<StartupLoadingScreenContent message="Preparing the app..." statusMessage="Starting..." />, {
      wrapper: LightThemeProvider,
    })
    const viewport = view.getByTestId(testIdWithKey('StartupLoadingScreenContentViewport'))
    const status = view.getByTestId(testIdWithKey('StartupLoadingScreenContentStatus'))

    expect(viewport).toHaveStyle({ opacity: 0 })
    expect(view.getByText('Preparing the app...')).toBeTruthy()
    expect(view.getByText('Starting...')).toBeTruthy()
    expect(view.getByLabelText('Starting...').props.accessibilityRole).toBe('progressbar')

    fireEvent(viewport, 'layout', { nativeEvent: { layout: { height: 800 } } })
    expect(viewport).toHaveStyle({ opacity: 0 })

    fireEvent(status, 'layout', { nativeEvent: { layout: { height: 43 } } })
    expect(viewport).toHaveStyle({ opacity: 1 })
  })
})
