import AccountTransferStrategy, { extractTransferToken } from './AccountTransferStrategy'

const logger = { warn: jest.fn() } as any

describe('AccountTransferStrategy', () => {
  it('extracts the transferToken from a selfsetup url', () => {
    expect(extractTransferToken('https://id.example.com/static/selfsetup.html?abc.def.ghi')).toBe('abc.def.ghi')
  })

  it('rejects other urls and empty queries', () => {
    expect(extractTransferToken('https://id.example.com/static/selfsetup.html')).toBeNull()
    expect(extractTransferToken('https://id.example.com/other.html?abc')).toBeNull()
    expect(extractTransferToken('not a url')).toBeNull()
  })

  it('returns an account-transfer result', async () => {
    const uri = 'https://id.example.com/static/selfsetup.html?abc'
    expect(AccountTransferStrategy.matches(uri)).toBe(true)
    await expect(AccountTransferStrategy.handle(uri, { agent: null, logger })).resolves.toEqual({
      kind: 'account-transfer',
      transferToken: 'abc',
    })
  })
})
