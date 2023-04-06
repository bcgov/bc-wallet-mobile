/* eslint-disable import/no-extraneous-dependencies */
import { AppRegistry } from 'react-native'

import { name as appName } from './app.json'
import StorybookUIRoot from './storybook'

AppRegistry.registerComponent(appName, () => StorybookUIRoot)
