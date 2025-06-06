import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
import Config from 'react-native-config'
import {
  getApplicationName,
  getBuildNumber,
  getSystemName,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info'
import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'

const logOptions: RemoteLoggerOptions = {
  lokiUrl: Config.REMOTE_LOGGING_URL,
  lokiLabels: {
    application: getApplicationName().toLowerCase(),
    version: `${getVersion()}-${getBuildNumber()}`,
    system: `${getSystemName()} v${getSystemVersion()}`,
  },
  autoDisableRemoteLoggingIntervalInMinutes,
}

const BCLogger = new RemoteLogger(logOptions)

export default BCLogger
