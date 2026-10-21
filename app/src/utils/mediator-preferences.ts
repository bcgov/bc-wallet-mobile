import { PreferencesState } from '@bifold/core'

type MediatorPreferences = Pick<PreferencesState, 'selectedMediator' | 'availableMediators'>

export interface MediatorReconciliation<T extends MediatorPreferences> {
  preferences: T
  /** Set when MEDIATOR_URL differs from the recorded one; record it with the preferences. */
  mediatorUrlToRecord?: string
}

/**
 * Reconciles the persisted mediator preferences with the build's MEDIATOR_URL on load: a changed URL
 * (a new build) replaces the previous default, an unchanged one keeps a developer's pick, and no
 * recorded URL starts over from the build's.
 */
export const reconcileMediatorPreferences = <T extends MediatorPreferences>(
  preferences: T,
  mediatorUrl: string | undefined,
  recordedMediatorUrl: string | undefined
): MediatorReconciliation<T> => {
  if (!mediatorUrl) {
    return { preferences }
  }

  if (recordedMediatorUrl === undefined) {
    return {
      preferences: { ...preferences, selectedMediator: mediatorUrl, availableMediators: [mediatorUrl] },
      mediatorUrlToRecord: mediatorUrl,
    }
  }

  // The build's URL leads the list and a replaced one leaves it
  const others = (preferences.availableMediators ?? []).filter(
    (url, index, list) => url && url !== mediatorUrl && url !== recordedMediatorUrl && list.indexOf(url) === index
  )
  const selectedMediator = others.includes(preferences.selectedMediator) ? preferences.selectedMediator : mediatorUrl

  return {
    preferences: { ...preferences, selectedMediator, availableMediators: [mediatorUrl, ...others] },
    mediatorUrlToRecord: mediatorUrl === recordedMediatorUrl ? undefined : mediatorUrl,
  }
}
