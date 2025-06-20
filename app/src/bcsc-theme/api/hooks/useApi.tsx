import usePairingApi from './usePairingApi'
import useConfigApi from './useConfigApi'
import useRegistrationApi from './useRegistrationApi'
import useAuthorizationApi from './useAuthorizationApi'

const useApi = () => {
  const config = useConfigApi()
  const pairing = usePairingApi()
  const registration = useRegistrationApi()
  const authorization = useAuthorizationApi()

  return {
    config,
    pairing,
    registration,
    authorization,
  }
}

export default useApi
