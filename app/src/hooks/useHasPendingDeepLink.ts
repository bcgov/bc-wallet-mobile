import { useDeepLinkViewModel } from '@/contexts/DeepLinkViewModelContext'
import { useEffect, useState } from 'react'

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
