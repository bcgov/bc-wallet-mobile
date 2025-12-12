import { NavigationContainerContext, NavigationContainerProvider } from '@/contexts/NavigationContainerContext'
import { renderHook } from '@testing-library/react-native'
import { useContext } from 'react'

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => <>{children}</>,
  createNavigationContainerRef: jest.fn(() => ({
    current: {
      getCurrentRoute: jest.fn(() => ({ name: undefined })),
    },
  })),
}))

jest.mock('@bifold/core', () => ({
  useTheme: jest.fn(() => ({
    NavigationTheme: {},
  })),
}))

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: {
    trackScreenEvent: jest.fn(),
  },
}))

describe('NavigationContainerContext', () => {
  it('should have isNavigationReady as false by default', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <NavigationContainerProvider>{children}</NavigationContainerProvider>
    }

    const { result } = renderHook(() => useContext(NavigationContainerContext), { wrapper })

    expect(result.current?.isNavigationReady).toBe(false)
  })
})
