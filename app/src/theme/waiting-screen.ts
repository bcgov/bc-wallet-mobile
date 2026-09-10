import { IColorPalette } from '@bifold/core'

export interface WaitingScreenColors {
  heading: string
  status: string
  track: string
  progress: string
}

export type AppColorPalette = IColorPalette & { waitingScreen?: WaitingScreenColors }

export const LightWaitingScreenColors: WaitingScreenColors = {
  heading: '#013366',
  status: '#474543',
  track: '#FAF9F8',
  progress: '#F8BA47',
}
