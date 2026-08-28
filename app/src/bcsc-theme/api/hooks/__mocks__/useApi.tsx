// Opt in with `jest.mock('@/bcsc-theme/api/hooks/useApi')`, then override the calls a
// test cares about via `jest.mocked(useApi).mockReturnValue(...)`. These defaults resolve
// successfully, so a suite that needs an error path must say so explicitly.
const useApi = jest.fn(() => ({
  registration: {
    updateRegistration: jest.fn(),
  },
  authorization: {
    authorizeDevice: jest.fn().mockResolvedValue({
      device_code: 'mock-device-code',
      user_code: 'mock-user-code',
      verified_email: 'test@example.com',
      expires_in: 3600,
    }),
  },
  deviceAttestation: {
    verifyAttestation: jest.fn().mockResolvedValue({ success: true }),
  },
  token: {
    deviceToken: jest.fn().mockResolvedValue({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
  },
}))

export default useApi
