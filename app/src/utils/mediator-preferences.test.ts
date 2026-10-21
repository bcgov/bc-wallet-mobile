import { reconcileMediatorPreferences } from './mediator-preferences'

const previous = 'https://mediator.example/invite?oob=previous'
const current = 'https://mediator.example/invite?oob=current'
const custom = 'https://mediator-dev.example/invite?oob=custom'

describe('reconcileMediatorPreferences', () => {
  it('leaves the preferences alone without a MEDIATOR_URL', () => {
    const preferences = { selectedMediator: custom, availableMediators: [previous, custom] }

    const result = reconcileMediatorPreferences(preferences, undefined, previous)

    expect(result.preferences).toBe(preferences)
    expect(result.mediatorUrlToRecord).toBeUndefined()
  })

  it('starts over from the MEDIATOR_URL when none was recorded', () => {
    const preferences = { selectedMediator: custom, availableMediators: [previous, custom] }

    const result = reconcileMediatorPreferences(preferences, current, undefined)

    expect(result.preferences).toEqual({ selectedMediator: current, availableMediators: [current] })
    expect(result.mediatorUrlToRecord).toBe(current)
  })

  describe('with an unchanged MEDIATOR_URL', () => {
    it('keeps a mediator picked in developer mode and records nothing', () => {
      const preferences = { selectedMediator: custom, availableMediators: [current, custom] }

      const result = reconcileMediatorPreferences(preferences, current, current)

      expect(result.preferences).toEqual(preferences)
      expect(result.mediatorUrlToRecord).toBeUndefined()
    })

    it('falls back to the MEDIATOR_URL when the selection is not on the list', () => {
      const preferences = { selectedMediator: '', availableMediators: [current] }

      const result = reconcileMediatorPreferences(preferences, current, current)

      expect(result.preferences.selectedMediator).toBe(current)
    })

    it('puts the MEDIATOR_URL first and drops empty and duplicate entries', () => {
      const preferences = { selectedMediator: custom, availableMediators: ['', custom, custom, current] }

      const result = reconcileMediatorPreferences(preferences, current, current)

      expect(result.preferences).toEqual({ selectedMediator: custom, availableMediators: [current, custom] })
    })
  })

  describe('with a changed MEDIATOR_URL', () => {
    it('moves a user on the previous default to the new one and records it', () => {
      const preferences = { selectedMediator: previous, availableMediators: [previous] }

      const result = reconcileMediatorPreferences(preferences, current, previous)

      expect(result.preferences).toEqual({ selectedMediator: current, availableMediators: [current] })
      expect(result.mediatorUrlToRecord).toBe(current)
    })

    it('keeps a mediator picked in developer mode and retires the previous default', () => {
      const preferences = { selectedMediator: custom, availableMediators: [previous, custom] }

      const result = reconcileMediatorPreferences(preferences, current, previous)

      expect(result.preferences).toEqual({ selectedMediator: custom, availableMediators: [current, custom] })
      expect(result.mediatorUrlToRecord).toBe(current)
    })

    it('merges a picked mediator that became the MEDIATOR_URL', () => {
      const preferences = { selectedMediator: current, availableMediators: [previous, current] }

      const result = reconcileMediatorPreferences(preferences, current, previous)

      expect(result.preferences).toEqual({ selectedMediator: current, availableMediators: [current] })
    })
  })
})
