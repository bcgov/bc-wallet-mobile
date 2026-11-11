import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { QRScannerFrame } from './QRScannerFrame'
import { QRScannerOverlay } from './QRScannerOverlay'

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

  it('leaves room for the message above the reticle when the message is taller than the gap', () => {
    const { root, UNSAFE_getByType } = render(
      <BasicAppContext>
        <QRScannerFrame message="A valid QR code will scan automatically" />
      </BasicAppContext>
    )

    // The frame measures its own area (first host view with onLayout) and the message row (second)
    const [, messageRow] = root.findAll((node) => String(node.type) === 'View' && Boolean(node.props.onLayout))
    fireEvent(messageRow, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } } })

    // The band above the reticle is as tall as the reticle's top edge, which now sits below the message
    let band = messageRow.parent!
    while (String(band.type) !== 'View') {
      band = band.parent!
    }
    expect(StyleSheet.flatten(band.props.style).height).toBeGreaterThanOrEqual(400)
    expect(UNSAFE_getByType(QRScannerOverlay).props.minCutoutY).toBeGreaterThanOrEqual(400)
  })
})
