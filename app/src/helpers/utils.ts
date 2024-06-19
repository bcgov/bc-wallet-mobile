import { Linking } from 'react-native'

export const openLink = async (url: string) => {
  // Only `https://` is allowed. Update manifest as needed.
  const supported = await Linking.canOpenURL(url)

  if (supported) {
    // Will open in device browser.
    await Linking.openURL(url)
  }
}
