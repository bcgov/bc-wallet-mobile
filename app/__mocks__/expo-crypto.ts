// expo-crypto pulls in expo-modules-core, which relies on a native `globalThis.expo`
// object that doesn't exist in the Jest environment. Stub the module instead.
const CryptoDigestAlgorithm = {
  MD2: 'MD2',
  MD4: 'MD4',
  MD5: 'MD5',
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
}

const CryptoEncoding = {
  BASE64: 'base64',
  HEX: 'hex',
}

module.exports = {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync: jest.fn(async () => 'mocked-digest'),
  getRandomBytes: jest.fn((byteCount: number) => new Uint8Array(byteCount)),
  getRandomBytesAsync: jest.fn(async (byteCount: number) => new Uint8Array(byteCount)),
  getRandomValues: jest.fn((typedArray: Uint8Array) => typedArray),
  randomUUID: jest.fn(() => '00000000-0000-0000-0000-000000000000'),
  digest: jest.fn(() => new ArrayBuffer(0)),
}
