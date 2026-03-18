import {
  getApplicationName,
  getBuildNumber,
  getSystemName,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info'

export const getUserAgentString = (): string => {
  const appName = getApplicationName().replace(/\s+/g, '')
  const version = getVersion()
  const systemName = getSystemName()
  const systemVersion = getSystemVersion()
  const buildNumber = getBuildNumber()

  return `${appName}/${version} (${systemName} ${systemVersion}; Build ${buildNumber})`
}
