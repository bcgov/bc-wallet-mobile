// organize-imports-ignore
import 'fast-text-encoding' // polyfill for TextEncoder and TextDecoder
import 'react-native-gesture-handler'
import 'reflect-metadata'

import { decode, encode } from 'base-64'

if (!global.btoa) {
  global.btoa = encode
}

if (!global.atob) {
  global.atob = decode
}

import { Buffer } from 'buffer'

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

import { AppRegistry, LogBox } from 'react-native'

import App from './App'
import { name as appName } from './app.json'

LogBox.ignoreLogs([
  // For Credo deps that are still very new
  /module is experimental and could have unexpected/,
])

AppRegistry.registerComponent(appName, () => App)
