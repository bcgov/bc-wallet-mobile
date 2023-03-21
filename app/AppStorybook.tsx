import { initLanguages } from 'aries-bifold'
import React from 'react'
import { LogBox } from 'react-native'

import bcwallet from './src'
import StorybookUIRoot from './storybook'

const { localization } = bcwallet

initLanguages(localization)

LogBox.ignoreAllLogs()

const Base = () => {
  return <StorybookUIRoot />
}

export default Base
