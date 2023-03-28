/* eslint-disable import/no-extraneous-dependencies */
/**
 * @format
 */
import 'react-native-gesture-handler'
// remove these when updated to react-native 0.65.0
import '@formatjs/intl-getcanonicallocales/polyfill'
import '@formatjs/intl-locale/polyfill'
import '@formatjs/intl-pluralrules/polyfill'
import '@formatjs/intl-pluralrules/locale-data/en' // locale-data for en
import '@formatjs/intl-displaynames/polyfill'
import '@formatjs/intl-displaynames/locale-data/en' // locale-data for en
import '@formatjs/intl-listformat/polyfill'
import '@formatjs/intl-listformat/locale-data/en' // locale-data for en
import '@formatjs/intl-numberformat/polyfill'
import '@formatjs/intl-numberformat/locale-data/en' // locale-data for en
import '@formatjs/intl-relativetimeformat/polyfill'
import '@formatjs/intl-relativetimeformat/locale-data/en' // locale-data for en
import '@formatjs/intl-datetimeformat/polyfill'
import '@formatjs/intl-datetimeformat/locale-data/en' // locale-data for en
import '@formatjs/intl-datetimeformat/add-all-tz' // Add ALL tz data

import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import { AppRegistry, LogBox } from 'react-native'
import Config from 'react-native-config'

import { name as appName } from './app.json'
import bcwallet from './src/'
const { theme } = bcwallet

const { ColorPallet } = theme

const navigationTheme = {
  dark: true,
  colors: {
    primary: ColorPallet.brand.primary,
    background: ColorPallet.brand.primaryBackground,
    card: ColorPallet.brand.primary,
    text: ColorPallet.grayscale.white,
    border: ColorPallet.grayscale.white,
    notification: ColorPallet.grayscale.white,
  },
}

LogBox.ignoreAllLogs()

const getBase = (App) => {
  return () => (
    <NavigationContainer theme={navigationTheme}>
      <App />
    </NavigationContainer>
  )
}

if (Config.LOAD_STORYBOOK === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const App = require('./AppStorybook').default
  AppRegistry.registerComponent(appName, () => getBase(App))
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const App = require('./App').default
  AppRegistry.registerComponent(appName, () => getBase(App))
}
