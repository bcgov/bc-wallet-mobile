import { testIdWithKey } from '@bifold/core'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { AppBanner, AppBannerSection, AppBannerSectionProps, BCSCBanner } from './AppBanner'

describe('AppBanner', () => {
  it('renders correctly with multiple messages', () => {
    const messages: AppBannerSectionProps[] = [
      { id: 'A' as BCSCBanner, title: 'Error Message', type: 'error', dismissible: true },
      { id: 'B' as BCSCBanner, title: 'Warning Message', type: 'warning', dismissible: false },
    ]

    const { getByText } = render(<AppBanner messages={messages} />)

    expect(getByText('Error Message')).toBeTruthy()
    expect(getByText('Warning Message')).toBeTruthy()
  })

  it('dismisses a banner when dismissible and tapped', () => {
    const messages: AppBannerSectionProps[] = [
      { id: 'A' as BCSCBanner, title: 'Dismissible Message', type: 'info', dismissible: true },
      { id: 'B' as BCSCBanner, title: 'Non dismissible Message', type: 'warning', dismissible: false },
    ]

    const { getByText, queryByText } = render(<AppBanner messages={messages} />)

    expect(getByText('Dismissible Message')).toBeTruthy()

    fireEvent.press(getByText('Dismissible Message'))

    expect(queryByText('Dismissible Message')).toBeFalsy()
    expect(getByText('Non dismissible Message')).toBeTruthy()
  })

  it('does not dismiss a non-dismissible banner when tapped', () => {
    const messages: AppBannerSectionProps[] = [
      { id: 'A' as BCSCBanner, title: 'Non dismissible Message', type: 'warning', dismissible: false },
    ]

    const { getByText } = render(<AppBanner messages={messages} />)

    fireEvent.press(getByText('Non dismissible Message'))

    expect(getByText('Non dismissible Message')).toBeTruthy()
  })

  it('orders banners by severity: error, warning, info, success', () => {
    const messages: AppBannerSectionProps[] = [
      { id: 'S1' as BCSCBanner, title: 'Success A', type: 'success' },
      { id: 'I1' as BCSCBanner, title: 'Info A', type: 'info' },
      { id: 'W1' as BCSCBanner, title: 'Warning A', type: 'warning' },
      { id: 'E1' as BCSCBanner, title: 'Error A', type: 'error' },
      { id: 'I2' as BCSCBanner, title: 'Info B', type: 'info' },
      { id: 'S2' as BCSCBanner, title: 'Success B', type: 'success' },
    ]

    const { getAllByTestId } = render(<AppBanner messages={messages} />)

    const titles = getAllByTestId(/text-(error|warning|info|success)$/).map((node) => node.props.children)
    expect(titles).toEqual(['Error A', 'Warning A', 'Info A', 'Info B', 'Success A', 'Success B'])
  })
})

describe('AppBannerSection', () => {
  it.each([
    ['error', '#CE3E39', '#FFFFFF'],
    ['warning', '#F8BB47', '#2D2D2D'],
    ['info', '#2E5DD7', '#FFFFFF'],
    ['success', '#42814A', '#FFFFFF'],
  ] as const)('%s banner uses the style-guide background and foreground', (type, background, foreground) => {
    const { getByTestId } = render(
      <AppBannerSection id={'A' as BCSCBanner} title="Title" description="Description" type={type} />
    )

    expect(getByTestId(testIdWithKey(`button-${type}`))).toHaveStyle({ backgroundColor: background })
    expect(getByTestId(testIdWithKey(`icon-${type}`))).toHaveStyle({ color: foreground })
    expect(getByTestId(testIdWithKey(`text-${type}`))).toHaveStyle({ color: foreground })
    expect(getByTestId(testIdWithKey(`description-${type}`))).toHaveStyle({ color: foreground })
  })

  it('calls onPress when tapped and dismissible', () => {
    const onPressMock = jest.fn()

    const { getByText } = render(
      <AppBannerSection
        id={'A' as BCSCBanner}
        title="Dismissible Message"
        type="info"
        dismissible={true}
        onPress={onPressMock}
      />
    )

    fireEvent.press(getByText('Dismissible Message'))

    expect(onPressMock).toHaveBeenCalled()
  })

  it('calls onPress when not dismissible', () => {
    const onPressMock = jest.fn()

    const { getByText } = render(
      <AppBannerSection
        id={'A' as BCSCBanner}
        title="Non-dismissible Message"
        type="warning"
        dismissible={false}
        onPress={onPressMock}
      />
    )

    fireEvent.press(getByText('Non-dismissible Message'))

    expect(onPressMock).toHaveBeenCalled()
  })
})
