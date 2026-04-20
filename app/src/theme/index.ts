import { BCWalletTheme } from '@bcwallet-theme/theme'
import { ITheme } from '@bifold/core'

import { DarkTheme } from './dark'
import { LightTheme } from './light'

export { DarkTheme, LightTheme }
export const themes: ITheme[] = [BCWalletTheme, DarkTheme, LightTheme]
