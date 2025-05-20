import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AppBanner, AppBannerSection, AppBannerSectionProps } from '../../src/bcsc-theme/components/AppBanner'
import { testIdWithKey } from '@bifold/core'

describe('AppBanner', () => {
  it('renders correctly with multiple messages', () => {
    const messages: AppBannerSectionProps[] = [
      { title: 'Error Message', type: 'error', dismissible: true },
      { title: 'Warning Message', type: 'warning', dismissible: false },
    ]

    const { getByText } = render(<AppBanner messages={messages} />)

    expect(getByText('Error Message')).toBeTruthy()
    expect(getByText('Warning Message')).toBeTruthy()
  })

  it('dismisses a banner when dismissible and tapped', () => {
    const messages: AppBannerSectionProps[] = [
      { title: 'Dismissible Message', type: 'info', dismissible: true },
      { title: 'Non dismissible Message', type: 'warning', dismissible: false },
    ]

    const { getByText, queryByText } = render(<AppBanner messages={messages} />)

    expect(getByText('Dismissible Message')).toBeTruthy()

    fireEvent.press(getByText('Dismissible Message'))

    expect(queryByText('Dismissible Message')).toBeFalsy()
    expect(getByText('Non dismissible Message')).toBeTruthy()
  })

  it('does not dismiss a non-dismissible banner when tapped', () => {
    const messages: AppBannerSectionProps[] = [
      { title: 'Non dismissible Message', type: 'warning', dismissible: false },
    ]

    const { getByText } = render(<AppBanner messages={messages} />)

    fireEvent.press(getByText('Non dismissible Message'))

    expect(getByText('Non dismissible Message')).toBeTruthy()
  })
})

describe('AppBannerSection', () => {
  it('renders correctly with the correct icon and color for type', () => {
    const { getByText, getByTestId } = render(
      <AppBannerSection title="Success Message" type="success" dismissible={true} />
    )

    expect(getByText('Success Message')).toBeTruthy()
    expect(getByTestId(testIdWithKey('icon-success'))).toBeTruthy()
  })

  it('calls onDismiss when tapped and dismissible', () => {
    const onDismissMock = jest.fn()

    const { getByText } = render(
      <AppBannerSection title="Dismissible Message" type="info" dismissible={true} onDismiss={onDismissMock} />
    )

    fireEvent.press(getByText('Dismissible Message'))

    expect(onDismissMock).toHaveBeenCalled()
  })

  it('does not call onDismiss when not dismissible', () => {
    const onDismissMock = jest.fn()

    const { getByText } = render(
      <AppBannerSection title="Non-dismissible Message" type="warning" dismissible={false} onDismiss={onDismissMock} />
    )

    fireEvent.press(getByText('Non-dismissible Message'))

    expect(onDismissMock).not.toHaveBeenCalled()
  })
})
