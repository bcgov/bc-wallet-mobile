import { RegistrationResponseData } from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { BCDispatchAction } from '@/store'
import { getVersion } from 'react-native-device-info'
import { SystemCheckUtils } from './system-checks'

interface BCSCStateStub {
  appVersion: string
  selectedNickname?: string
  registrationAccessToken?: string
}

type UpdateRegistrationFunction = (
  registrationAccessToken?: string,
  selectedNickname?: string
) => Promise<RegistrationResponseData>

/**
 * Checks conditions to determine if the device registration needs to be updated.
 *
 * Currently supports:
 *    - App version mismatch (previously registered app version differs from current app version)
 *
 * @class UpdateDeviceRegistrationSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class UpdateDeviceRegistrationSystemCheck {
  private readonly bcscState: BCSCStateStub
  private readonly updateRegistration: UpdateRegistrationFunction
  private readonly utils: SystemCheckUtils

  constructor(bcscState: BCSCStateStub, updateRegistration: UpdateRegistrationFunction, utils: SystemCheckUtils) {
    this.bcscState = bcscState
    this.utils = utils
    this.updateRegistration = updateRegistration
  }

  runCheck() {
    return this.bcscState.appVersion === getVersion()
  }

  async onFail() {
    this.utils.dispatch({ type: BCDispatchAction.UPDATE_APP_VERSION })
    await this.updateRegistration(this.bcscState.registrationAccessToken, this.bcscState.selectedNickname)
  }
}
