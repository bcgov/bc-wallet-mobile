import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

const useThirdPartyKeyboardWarning = () => {
  const { t } = useTranslation()
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()
}

export default useThirdPartyKeyboardWarning
