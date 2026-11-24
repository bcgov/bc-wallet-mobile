import {
  addNewBuildToHistory,
  formatBuildHistory,
  isAppBuildEqual,
  MAX_APP_BUILD_HISTORY,
  toAppBuild,
} from '@/utils/app-build'

describe('app-build', () => {
  describe('addNewBuildToHistory', () => {
    const fullHistory = () =>
      Array.from({ length: MAX_APP_BUILD_HISTORY }, (_, i) => ({
        version: '4.0.0',
        build: String(MAX_APP_BUILD_HISTORY - i),
      }))

    it('starts a history from undefined', () => {
      const result = addNewBuildToHistory({ version: '4.1.0', build: '1000' }, undefined)

      expect(result.history).toEqual([{ version: '4.1.0', build: '1000' }])
      expect(result.added).toBe(true)
    })

    it('puts a different build at the front, ahead of the previous ones', () => {
      const history = [{ version: '4.0.0', build: '999' }]

      const result = addNewBuildToHistory({ version: '4.1.0', build: '1000' }, history)

      expect(result.history).toEqual([
        { version: '4.1.0', build: '1000' },
        { version: '4.0.0', build: '999' },
      ])
      expect(result.added).toBe(true)
    })

    it('records a new build number under the same version', () => {
      const history = [{ version: '4.1.0', build: '999' }]

      const result = addNewBuildToHistory({ version: '4.1.0', build: '1000' }, history)

      expect(result.history).toHaveLength(2)
      expect(result.added).toBe(true)
    })

    it('does not add the build when it matches the newest entry', () => {
      const history = [{ version: '4.1.0', build: '1000' }]

      const result = addNewBuildToHistory({ version: '4.1.0', build: '1000' }, history)

      expect(result.history).toEqual(history)
      expect(result.added).toBe(false)
    })

    it('keeps at most the cap, dropping the oldest builds', () => {
      const result = addNewBuildToHistory({ version: '4.0.0', build: '999' }, fullHistory())

      expect(result.history).toHaveLength(MAX_APP_BUILD_HISTORY)
      expect(result.history[0]).toEqual({ version: '4.0.0', build: '999' })
      expect(result.history).not.toContainEqual({ version: '4.0.0', build: '1' })
    })

    it('reports a build as added when it pushes a full history past the cap', () => {
      const result = addNewBuildToHistory({ version: '4.0.0', build: '999' }, fullHistory())

      expect(result.added).toBe(true)
    })

    it('does not trim a history that is already at the cap when the build is unchanged', () => {
      const history = fullHistory()

      const result = addNewBuildToHistory({ version: '4.0.0', build: String(MAX_APP_BUILD_HISTORY) }, history)

      expect(result.history).toEqual(history)
      expect(result.added).toBe(false)
    })

    it('trims a history longer than the cap even when the build is unchanged', () => {
      const history = [...fullHistory(), { version: '3.9.0', build: '0' }]

      const result = addNewBuildToHistory({ version: '4.0.0', build: String(MAX_APP_BUILD_HISTORY) }, history)

      expect(result.history).toHaveLength(MAX_APP_BUILD_HISTORY)
      expect(result.added).toBe(false)
    })

    it('does not change the history it was given', () => {
      const history = [{ version: '4.0.0', build: '999' }]

      addNewBuildToHistory({ version: '4.1.0', build: '1000' }, history)

      expect(history).toEqual([{ version: '4.0.0', build: '999' }])
    })
  })

  describe('toAppBuild', () => {
    it('builds an app build from a complete pair', () => {
      expect(toAppBuild('4.1.0', '1000')).toEqual({ version: '4.1.0', build: '1000' })
    })

    it.each([
      ['a missing version', undefined, '1000'],
      ['a missing build', '4.1.0', undefined],
      ['an empty version', '', '1000'],
      ['an empty build', '4.1.0', ''],
    ])('returns null for %s', (_name, version, build) => {
      expect(toAppBuild(version, build)).toBeNull()
    })
  })

  describe('isAppBuildEqual', () => {
    it('is true when version and build match', () => {
      expect(isAppBuildEqual({ version: '4.1.0', build: '1000' }, { version: '4.1.0', build: '1000' })).toBe(true)
    })

    it('is false when the version differs', () => {
      expect(isAppBuildEqual({ version: '4.0.0', build: '1000' }, { version: '4.1.0', build: '1000' })).toBe(false)
    })

    it('is false when the build differs', () => {
      expect(isAppBuildEqual({ version: '4.1.0', build: '999' }, { version: '4.1.0', build: '1000' })).toBe(false)
    })

    it('is false when there is no first build', () => {
      expect(isAppBuildEqual(undefined, { version: '4.1.0', build: '1000' })).toBe(false)
    })
  })

  describe('formatBuildHistory', () => {
    it('returns an empty string for an empty history', () => {
      expect(formatBuildHistory([])).toBe('')
    })

    it('formats a single build as version+build', () => {
      expect(formatBuildHistory([{ version: '4.1.0', build: '1000' }])).toBe('4.1.0+1000')
    })

    it('joins the builds in the order given, with no trailing separator', () => {
      expect(
        formatBuildHistory([
          { version: '4.1.0', build: '1000' },
          { version: '4.0.0', build: '999' },
          { version: '3.9.0', build: '90' },
        ])
      ).toBe('4.1.0+1000 < 4.0.0+999 < 3.9.0+90')
    })

    it('keeps builds that share a version apart by their build number', () => {
      expect(
        formatBuildHistory([
          { version: '4.1.0', build: '1001' },
          { version: '4.1.0', build: '1000' },
        ])
      ).toBe('4.1.0+1001 < 4.1.0+1000')
    })
  })
})
