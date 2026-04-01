import { VerificationStatus } from '@/store'
import { BCSCAccountType, BCSCCardType, CredentialInfo } from 'react-native-bcsc-core'
import { createMinimalCredential, getCredentialVerificationStatus, isUserVerified } from './bcsc-credential'
import { BCSCEvent, BCSCReason } from './id-token'

describe('createMinimalCredential', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create a credential with required fields', () => {
    const credential = createMinimalCredential('https://issuer.example.com', 'user-123')

    expect(credential).toEqual({
      issuer: 'https://issuer.example.com',
      subject: 'user-123',
      label: 'BC Services Card',
      created: 1700000000,
      bcscEvent: 'Authorization',
      bcscReason: 'Approved by Agent',
      cardType: undefined,
      accountType: undefined,
      lastUsed: 1700000000,
      updatedDate: 1700000000,
    })
  })

  it('should set bcscEvent to Authorization', () => {
    const credential = createMinimalCredential('https://issuer.example.com', 'user-123')
    expect(credential.bcscEvent).toBe(BCSCEvent.Authorization)
  })

  it('should set bcscReason to Approved by Agent', () => {
    const credential = createMinimalCredential('https://issuer.example.com', 'user-123')
    expect(credential.bcscReason).toBe(BCSCReason.ApprovedByAgent)
  })

  it('should include optional cardType and accountType when provided', () => {
    const credential = createMinimalCredential(
      'https://issuer.example.com',
      'user-123',
      BCSCCardType.PhotoCard,
      BCSCAccountType.PhotoCard
    )

    expect(credential.cardType).toBe(BCSCCardType.PhotoCard)
    expect(credential.accountType).toBe(BCSCAccountType.PhotoCard)
  })

  it('should set timestamps as unix seconds', () => {
    const credential = createMinimalCredential('https://issuer.example.com', 'user-123')

    expect(credential.created).toBe(1700000000)
    expect(credential.lastUsed).toBe(1700000000)
    expect(credential.updatedDate).toBe(1700000000)
  })
})

describe('getCredentialVerificationStatus', () => {
  const baseCredential: CredentialInfo = {
    issuer: 'https://issuer.example.com',
    subject: 'user-123',
    label: 'BC Services Card',
    created: 1700000000,
    bcscEvent: BCSCEvent.Authorization,
    bcscReason: BCSCReason.ApprovedByAgent,
  }

  it('should return UNVERIFIED when credential is null', () => {
    expect(getCredentialVerificationStatus(null)).toBe(VerificationStatus.UNVERIFIED)
  })

  it('should return VERIFIED for Authorization event', () => {
    expect(getCredentialVerificationStatus({ ...baseCredential, bcscEvent: BCSCEvent.Authorization })).toBe(
      VerificationStatus.VERIFIED
    )
  })

  it('should return VERIFIED for Renewal event', () => {
    expect(getCredentialVerificationStatus({ ...baseCredential, bcscEvent: BCSCEvent.Renewal })).toBe(
      VerificationStatus.VERIFIED
    )
  })

  it('should return VERIFIED for Replace event', () => {
    expect(getCredentialVerificationStatus({ ...baseCredential, bcscEvent: BCSCEvent.Replace })).toBe(
      VerificationStatus.VERIFIED
    )
  })

  it('should return DEACTIVATED for Cancel event', () => {
    expect(getCredentialVerificationStatus({ ...baseCredential, bcscEvent: BCSCEvent.Cancel })).toBe(
      VerificationStatus.DEACTIVATED
    )
  })

  it('should return DEACTIVATED for Expire event', () => {
    expect(getCredentialVerificationStatus({ ...baseCredential, bcscEvent: BCSCEvent.Expire })).toBe(
      VerificationStatus.DEACTIVATED
    )
  })
})

describe('isUserVerified', () => {
  it('should return false when verified is false', async () => {
    const success = isUserVerified({
      verified: false,
    } as any)

    expect(success).toBe(false)
  })

  it('should return false when verified is false and credential is cancelled', async () => {
    const success = isUserVerified({
      verified: false,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.DEACTIVATED,
    } as any)

    expect(success).toBe(false)
  })

  it('should return true when verified is true and credential is verified', async () => {
    const success = isUserVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.VERIFIED,
    } as any)

    expect(success).toBe(true)
  })

  it('should return true when verification status is UNVERIFIED but we have a refresh token', async () => {
    const success = isUserVerified({
      verified: true,
      refreshToken: 'mockRefreshToken',
      verifiedStatus: VerificationStatus.UNVERIFIED,
    } as any)

    expect(success).toBe(true)
  })
})
