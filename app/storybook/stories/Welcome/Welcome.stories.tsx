/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/react-native'
import React from 'react'

import Welcome from './index'

storiesOf('Welcome', module).add('to Storybook', () => <Welcome />)
