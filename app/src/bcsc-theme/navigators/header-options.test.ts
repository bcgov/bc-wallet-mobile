import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createStackHeader } from '../components/NavigationHeaders'
import { getMainStackHeaderOptions } from './header-options'

describe('getMainStackHeaderOptions', () => {
  it("returns BCSC's header, back button and help menu", () => {
    const options = getMainStackHeaderOptions()

    expect(options).toMatchObject({
      header: createStackHeader,
      headerLeft: createHeaderBackButton,
      headerShadowVisible: false,
      headerBackTitleVisible: false,
      headerBackTestID: testIdWithKey(TestIds.common.back),
    })
    expect(options.headerRight).toEqual(expect.any(Function))
  })
})
