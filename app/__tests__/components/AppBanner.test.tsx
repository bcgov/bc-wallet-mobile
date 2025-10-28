import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import {
  AppBanner,
  AppBannerSection,
  AppBannerSectionProps,
  BCSCBanner,
} from '../../src/bcsc-theme/components/AppBanner'
import { testIdWithKey } from '@bifold/core'

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
})

describe('AppBannerSection', () => {
  it('renders correctly with the correct icon and color for type', () => {
    const { getByText, getByTestId } = render(
      <AppBannerSection id={'A' as BCSCBanner} title="Success Message" type="success" dismissible={true} />
    )

    expect(getByText('Success Message')).toBeTruthy()
    expect(getByTestId(testIdWithKey('icon-success'))).toBeTruthy()
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
