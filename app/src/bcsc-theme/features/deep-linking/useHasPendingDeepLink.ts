import { useEffect, useState } from 'react'
import { useDeepLinkViewModel } from './DeepLinkViewModelContext'

export const useHasPendingDeepLink = () => {
  const viewModel = useDeepLinkViewModel()

  const [hasPending, setHasPending] = useState(viewModel.hasPendingDeepLink)

  useEffect(() => {
    return viewModel.onPendingStateChange((pending) => {
      setHasPending(pending)
    })
  }, [viewModel])

  return hasPending
}
