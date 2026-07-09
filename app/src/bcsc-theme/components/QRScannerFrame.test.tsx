import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { QRScannerFrame } from './QRScannerFrame'

describe('QRScannerFrame', () => {
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <QRScannerFrame message="A valid QR code will scan automatically" />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shrinks the message text to its widest rendered line so it centers with the reticle', () => {
    const { getByText } = render(
      <BasicAppContext>
        <QRScannerFrame message="A valid QR code will scan automatically" />
      </BasicAppContext>
    )

    const message = getByText('A valid QR code will scan automatically')
    fireEvent(message, 'textLayout', { nativeEvent: { lines: [{ width: 156.5 }, { width: 120 }] } })

    expect(StyleSheet.flatten(message.props.style).width).toBe(157)
  })
})
