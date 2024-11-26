import { useEffect } from 'react'
import Toast, { ToastShowParams } from 'react-native-toast-message'

type HookProps = {
  enabled?: boolean
  options: ToastShowParams
}

export function useToast({ enabled = false, options }: HookProps) {
  useEffect(() => {
    if (!enabled) return
    Toast.show(options)
  }, [enabled, options])
}
