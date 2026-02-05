import { isThirdPartyKeyboardActive as NativeCheck } from 'react-native-bcsc-core'

export const isThirdPartyKeyboardActive = async (): Promise<boolean> => {
  return NativeCheck()
}
