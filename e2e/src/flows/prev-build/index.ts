import { currentPrevBuild } from './current.js'
import { type Lineage, lineageOf, requirePrevVersion } from './sources.js'
import type { PrevBuild } from './types.js'
import { v3PrevBuild } from './v3.js'
import { v403PrevBuild } from './v403.js'

const DRIVERS: Record<Lineage, PrevBuild> = { v3: v3PrevBuild, v403: v403PrevBuild, current: currentPrevBuild }

/**
 * The driver for the build this session booted — `PREV_VERSION`, the same value the config read to pick
 * the binary — labelled with the version. `expected` pins a spec to one lineage (the unverified base
 * specs differ per lineage) and names a mismatch instead of driving the wrong screens.
 */
export function prevBuildFromEnv(expected?: Lineage): PrevBuild {
  const version = requirePrevVersion()
  const lineage = lineageOf(version)
  if (expected && lineage !== expected) {
    throw new Error(`This spec drives the ${expected} lineage, but PREV_VERSION=${version} is the ${lineage} lineage`)
  }
  return { ...DRIVERS[lineage], label: version }
}
