import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import FloatingScanButton from './FloatingScanButton'
import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock('./useFloatingScanButtonViewModel', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@bifold/core', () => ({
  testIdWithKey: (k: string) => `com.ariesbifold:id/${k}`,
  useTheme: () => ({
    ColorPalette: {
      brand: { primary: '#FCBA19', primaryBackground: '#013366' },
      grayscale: { black: '#000' },
    },
  }),
}))
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')

const mockViewModel = useFloatingScanButtonViewModel as jest.MockedFunction<typeof useFloatingScanButtonViewModel>

describe('FloatingScanButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when the view model reports not visible', () => {
    mockViewModel.mockReturnValue({ isVisible: false })
    const { queryByTestId } = render(<FloatingScanButton activeTabName={BCSCScreens.Services} onPress={jest.fn()} />)
    expect(queryByTestId('com.ariesbifold:id/FloatingScanButton')).toBeNull()
  })

  it('renders and forwards onPress when visible', () => {
    const onPress = jest.fn()
    mockViewModel.mockReturnValue({ isVisible: true })

    const { getByTestId } = render(<FloatingScanButton activeTabName={BCSCScreens.Home} onPress={onPress} />)
    const button = getByTestId('com.ariesbifold:id/FloatingScanButton')
    expect(button).toBeTruthy()

    fireEvent.press(button)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('exposes accessibility metadata', () => {
    mockViewModel.mockReturnValue({ isVisible: true })
    const { getByTestId } = render(<FloatingScanButton activeTabName={BCSCScreens.Home} onPress={jest.fn()} />)
    const button = getByTestId('com.ariesbifold:id/FloatingScanButton')
    expect(button.props.accessibilityRole).toBe('button')
    expect(button.props.accessibilityLabel).toBe('AddCredentialSlider.ScanQRCode')
  })
})
