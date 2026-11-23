import { getInitialEnvironment } from '@/utils/environment'
import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

export const EnvironmentSchema = z.object({
  name: z.string(),
  iasAgentInviteUrl: z.string(),
  iasPortalUrl: z.string(),
  appToAppUrl: z.string(),
  iasApiBaseUrl: z.string(),
  analyticsAppId: z.string(),
})

const DeveloperFields = z.object({
  environment: EnvironmentSchema,
  // enabledAt is an ISO timestamp
  remoteDebugging: z.object({ enabledAt: z.string().optional(), sessionId: z.number().optional() }),
  enableProxy: z.boolean(),
  enableAppToAppPersonFlow: z.boolean(),
  enableAttestation: z.boolean(),
  // Bifold theme name; undefined means the app's default theme
  theme: z.string().optional(),
})
export type DeveloperState = z.infer<typeof DeveloperFields>

// Stored partially: the defaults depend on the build, so a field that was never set keeps its default on load
export const DeveloperSchema = DeveloperFields.partial()

export const defaultDeveloper = (): DeveloperState => ({
  environment: getInitialEnvironment(),
  remoteDebugging: {},
  enableProxy: false,
  enableAppToAppPersonFlow: false,
  enableAttestation: false,
})

export const DEVELOPER_KEY = persistedKey({
  key: 'developer',
  schema: DeveloperSchema,
  backend: 'plain',
  // Nothing stored means every default; the slice computes them when the store is created
  initial: {},
  onUnreadable: 'initial',
})

export interface DeveloperSlice {
  developer: DeveloperState & {
    update(patch: Partial<DeveloperState>): Promise<void>
    setTheme(theme: string): Promise<void>
  }
}

export const createDeveloperSlice =
  ({ persist }: SliceContext): BCSCSlice<DeveloperSlice> =>
  () => ({
    developer: {
      ...defaultDeveloper(),
      update: (patch) => persist.update(DEVELOPER_KEY, (d) => ({ ...d, ...patch })),
      setTheme: (theme) => persist.update(DEVELOPER_KEY, (d) => ({ ...d, theme })),
    },
  })
