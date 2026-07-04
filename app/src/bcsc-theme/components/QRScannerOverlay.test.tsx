import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { QRScannerOverlay } from './QRScannerOverlay'

describe('QRScannerOverlay', () => {
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <QRScannerOverlay />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
