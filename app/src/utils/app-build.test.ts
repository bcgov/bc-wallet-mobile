import { addNewBuildToHistory, isAppBuildEqual, toAppBuild } from '@/utils/app-build'

describe('app-build', () => {
  describe('addNewBuildToHistory', () => {
    it('starts a history from undefined', () => {
      expect(addNewBuildToHistory('4.1.0', '1000', undefined)).toEqual([{ version: '4.1.0', build: '1000' }])
    })

    it('puts a different build at the front, ahead of the previous ones', () => {
      const history = [{ version: '4.0.0', build: '999' }]

      expect(addNewBuildToHistory('4.1.0', '1000', history)).toEqual([
        { version: '4.1.0', build: '1000' },
        { version: '4.0.0', build: '999' },
      ])
    })

    it('records a new build number under the same version', () => {
      const history = [{ version: '4.1.0', build: '999' }]

      expect(addNewBuildToHistory('4.1.0', '1000', history)).toHaveLength(2)
    })

    it('does not add the build when it matches the newest entry', () => {
      const history = [{ version: '4.1.0', build: '1000' }]

      expect(addNewBuildToHistory('4.1.0', '1000', history)).toEqual(history)
    })

    it('does not change the history it was given', () => {
      const history = [{ version: '4.0.0', build: '999' }]

      addNewBuildToHistory('4.1.0', '1000', history)

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
})
