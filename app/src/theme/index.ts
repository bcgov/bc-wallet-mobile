import { BCWalletTheme } from '@bcwallet-theme/theme'
import { ITheme } from '@bifold/core'

import { DarkTheme } from './dark'
import { LightTheme } from './light'

export { DarkTheme } from './dark'
export { LightTheme } from './light'
export const themes: ITheme[] = [BCWalletTheme, DarkTheme, LightTheme]
