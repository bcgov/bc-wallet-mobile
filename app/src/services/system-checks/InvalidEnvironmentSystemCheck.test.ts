import { BCSCModals } from '@/bcsc-theme/types/navigators'
import * as environment from '@/utils/environment'
import { IASEnvironment } from '@/utils/environment'
import { InvalidEnvironmentSystemCheck } from './InvalidEnvironmentSystemCheck'

describe('InvalidEnvironmentSystemCheck', () => {
  const utils = { logger: { debug: jest.fn() } } as any

  const setup = (isProduction: boolean, env: IASEnvironment) => {
    jest.spyOn(environment, 'isProductionBundle').mockReturnValue(isProduction)
    const navigation = { navigate: jest.fn() } as any
    return { check: new InvalidEnvironmentSystemCheck(env, navigation, utils), navigation }
  }

  it('passes on a non-production bundle', async () => {
    const { check } = setup(false, IASEnvironment.SIT)
    expect(await check.runCheck()).toBe(true)
  })

  it('passes on a production bundle with the production environment', async () => {
    const { check } = setup(true, IASEnvironment.PROD)
    expect(await check.runCheck()).toBe(true)
  })

  it('passes on a production bundle with a JSON copy of the production environment', async () => {
    const { check } = setup(true, JSON.parse(JSON.stringify(IASEnvironment.PROD)))
    expect(await check.runCheck()).toBe(true)
  })

  it('fails on a production bundle with a non-production environment', async () => {
    const { check } = setup(true, IASEnvironment.SIT)
    expect(await check.runCheck()).toBe(false)
  })

  it('navigates to the invalid environment modal on fail', () => {
    const { check, navigation } = setup(true, IASEnvironment.SIT)
    check.onFail()
    expect(navigation.navigate).toHaveBeenCalledWith(BCSCModals.InvalidEnvironment)
  })
})
