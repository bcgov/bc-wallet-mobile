import { createDeviceAuthTokenHintJWT } from '../../utils/device-auth-token-hint'

describe('deviceAuthTokenHint', () => {
  const token = createDeviceAuthTokenHintJWT({
    clientId: 'clientId',
    audience: 'audience',
    firstName: 'Steve',
    lastName: 'Brule',
    birthDate: '2000-01-01',
    middleNames: ['Eh', 'Bee'],
    gender: 'male',
    address: {
      streetAddress: '123 Main St',
      locality: 'Victoria',
      region: 'BC',
      postalCode: 'V8W 1P6',
      country: 'CA',
    },
  })

  // TODO (MD): Add more comprehensive tests to validate the contents of the token
  expect(token).toBeDefined()
})
