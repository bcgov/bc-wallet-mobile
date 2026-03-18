import {
  getApplicationName,
  getBuildNumber,
  getSystemName,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info'

let cachedUserAgentString: string | undefined

export const getUserAgentString = (): string => {
  if (cachedUserAgentString) return cachedUserAgentString

  const appName = getApplicationName().replaceAll(/\s+/g, '')
  const version = getVersion()
  const systemName = getSystemName()
  const systemVersion = getSystemVersion()
  const buildNumber = getBuildNumber()

  cachedUserAgentString = `${appName}/${version} (${systemName} ${systemVersion}; Build ${buildNumber})`
  return cachedUserAgentString
}
