import usePairingApi from './usePairingApi'
import useConfigApi from './useConfigApi'

const useApi = () => {
  const config = useConfigApi()
  const pairing = usePairingApi()

  return {
    config,
    pairing,
  }
}

export default useApi
