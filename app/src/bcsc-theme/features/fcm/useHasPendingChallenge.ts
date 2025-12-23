import { useEffect, useState } from 'react'

import { useFcmViewModel } from './FcmViewModelContext'

export const useHasPendingChallenge = () => {
  const viewModel = useFcmViewModel()

  const [hasPending, setHasPending] = useState(viewModel.hasPendingChallenge)

  useEffect(() => {
    return viewModel.onPendingStateChange((pending) => {
      setHasPending(pending)
    })
  }, [viewModel])

  return hasPending
}
