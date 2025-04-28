import React, { createContext, useContext } from 'react'
import { ITheme } from '@bifold/core'
import { defaultTheme } from '../theme'

type Props = {
  children: React.ReactNode
  theme: ITheme
}

export const ThemeContext = createContext<ITheme>(defaultTheme) // default fallback

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children, theme }: Props) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
