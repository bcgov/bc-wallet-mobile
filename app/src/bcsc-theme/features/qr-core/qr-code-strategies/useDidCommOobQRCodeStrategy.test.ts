import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import * as Bifold from '@bifold/core'
import { QrCodeScanError } from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { useDidCommOobQRCodeStrategy } from './useDidCommOobQRCodeStrategy'

jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider')
const mockUseBCSCAgent = jest.mocked(useBCSCAgent)

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const OOB_URI = 'https://x?oob=foo'

const makeAgent = (
  overrides?: Partial<{ goalCode?: string; throwOnParse: boolean; recordId: string; existingRecordId: string | null }>
) => {
  const goalCode = overrides?.goalCode
  const throwOnParse = overrides?.throwOnParse ?? false
  const recordId = overrides?.recordId ?? 'oob-123'
  const existingRecordId = overrides?.existingRecordId ?? null
  const parseInvitation = jest.fn(async () => {
    if (throwOnParse) {
      throw new Error('parse failed')
    }
    return goalCode === '__noparse__' ? null : { id: 'inv-1', goalCode }
  })
  const findByReceivedInvitationId = jest.fn(async () => (existingRecordId ? { id: existingRecordId } : null))
  const receiveInvitation = jest.fn(async () => ({ outOfBandRecord: { id: recordId } }))
  return {
    agent: { modules: { didcomm: { oob: { parseInvitation, findByReceivedInvitationId, receiveInvitation } } } },
    spies: { parseInvitation, findByReceivedInvitationId, receiveInvitation },
  }
}

describe('useDidCommOobQRCodeStrategy', () => {
  const onSuccess = jest.fn()
  const mockWaitForAgent = jest.fn()

  const setup = () => renderHook(() => useDidCommOobQRCodeStrategy(onSuccess)).result.current

  const useAgent = (agent: unknown) => mockWaitForAgent.mockResolvedValue(agent)

  const setNickname = (selectedNickname?: string) =>
    jest.mocked(Bifold).useStore.mockReturnValue([{ bcsc: { selectedNickname } } as any, jest.fn()])

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseBCSCAgent.mockReturnValue({ waitForAgent: mockWaitForAgent } as any)
    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
    setNickname(undefined)
  })

  describe('matches', () => {
    it('matches DIDComm invitations and OpenID URIs (so handle can reject them with a clear reason)', () => {
      const { matches } = setup()

      expect(matches(OOB_URI)).toBe(true)
      expect(matches('openid://x')).toBe(true)
      expect(matches('openid-credential-offer://abc')).toBe(true)
    })

    it('matches VC Authn login URLs', () => {
      expect(setup().matches('https://example.com/url/pres_exch/123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    })

    it('does not match unrelated URLs', () => {
      const { matches } = setup()

      expect(matches('https://www.gov.bc.ca')).toBe(false)
      expect(matches('https://example.com/url/pres_exch/not-a-uuid')).toBe(false)
      expect(matches('not a url')).toBe(false)
    })
  })

  describe('handle', () => {
    it('throws AgentNotReady when the agent is unavailable', async () => {
      useAgent(null)

      const result = setup().handle(OOB_URI)

      await expect(result).rejects.toBeInstanceOf(QrCodeScanError)
      await expect(result).rejects.toMatchObject({ message: 'BCSC.Scan.Unsupported.AgentNotReady' })
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('waits for the agent to finish booting before handling', async () => {
      const { agent, spies } = makeAgent({ recordId: 'rec-1' })
      let resolveAgent!: (value: unknown) => void
      mockWaitForAgent.mockReturnValue(new Promise((resolve) => (resolveAgent = resolve)))

      const pending = setup().handle(OOB_URI)
      await Promise.resolve()
      expect(spies.parseInvitation).not.toHaveBeenCalled()

      resolveAgent(agent)
      await pending

      expect(spies.parseInvitation).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledWith('rec-1')
    })

    it.each([
      ['credential offers', 'openid-credential-offer://abc'],
      ['presentation requests', 'openid://abc'],
    ])('rejects OpenID %s', async (_label, uri) => {
      const { agent, spies } = makeAgent()
      useAgent(agent)

      const result = setup().handle(uri)

      await expect(result).rejects.toBeInstanceOf(QrCodeScanError)
      await expect(result).rejects.toMatchObject({ message: 'BCSC.Scan.Unsupported.OpenID' })
      expect(spies.parseInvitation).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('rejects mediator invitations (goalCode aries.vc.mediate)', async () => {
      const { agent, spies } = makeAgent({ goalCode: 'aries.vc.mediate' })
      useAgent(agent)

      await expect(setup().handle(OOB_URI)).rejects.toMatchObject({ message: 'BCSC.Scan.Unsupported.Mediator' })

      expect(spies.receiveInvitation).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('throws unrecognized when the invitation cannot be parsed', async () => {
      const { agent, spies } = makeAgent({ goalCode: '__noparse__' })
      useAgent(agent)

      await expect(setup().handle(OOB_URI)).rejects.toMatchObject({ message: 'BCSC.Scan.UnrecognizedQR' })

      expect(spies.parseInvitation).toHaveBeenCalledTimes(1)
      expect(spies.receiveInvitation).not.toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('propagates parse errors without calling onSuccess', async () => {
      const { agent } = makeAgent({ throwOnParse: true })
      useAgent(agent)

      await expect(setup().handle(OOB_URI)).rejects.toThrow('parse failed')

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('parses the invitation exactly once on the success path', async () => {
      const { agent, spies } = makeAgent({ recordId: 'rec-1' })
      useAgent(agent)

      await setup().handle(OOB_URI)

      expect(spies.parseInvitation).toHaveBeenCalledTimes(1)
    })

    it('calls onSuccess with the new oobRecordId', async () => {
      const { agent, spies } = makeAgent({ recordId: 'rec-42' })
      useAgent(agent)

      await setup().handle(OOB_URI)

      expect(spies.receiveInvitation).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledWith('rec-42')
    })

    it('reuses an existing OOB record instead of receiving the same invitation twice', async () => {
      const { agent, spies } = makeAgent({ existingRecordId: 'rec-existing' })
      useAgent(agent)

      await setup().handle(OOB_URI)

      expect(spies.findByReceivedInvitationId).toHaveBeenCalledWith('inv-1')
      expect(spies.receiveInvitation).not.toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledWith('rec-existing')
    })

    it('propagates receiveInvitation errors without calling onSuccess', async () => {
      const { agent, spies } = makeAgent()
      spies.receiveInvitation.mockRejectedValue(new Error('receive failed'))
      useAgent(agent)

      await expect(setup().handle(OOB_URI)).rejects.toThrow('receive failed')

      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('wallet label', () => {
    it("sends the user's nickname to receiveInvitation so the inviter sees this wallet name", async () => {
      const { agent, spies } = makeAgent({ recordId: 'rec-1' })
      useAgent(agent)
      setNickname("Kjartan's iPhone")

      await setup().handle(OOB_URI)

      expect(spies.receiveInvitation).toHaveBeenCalledWith(
        { id: 'inv-1', goalCode: undefined },
        { label: "Kjartan's iPhone" }
      )
    })

    // Replaces the old "placeholder label when ctx.label is missing" test: the label now comes from the
    // store and defaults to the same name WalletNameDisplay shows.
    it('falls back to the default wallet name when no nickname is set', async () => {
      const { agent, spies } = makeAgent({ recordId: 'rec-1' })
      useAgent(agent)

      await setup().handle(OOB_URI)

      expect(spies.receiveInvitation).toHaveBeenCalledWith({ id: 'inv-1', goalCode: undefined }, { label: 'My Wallet' })
    })
  })
})
