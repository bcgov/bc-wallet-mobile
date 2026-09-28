/**
 * Server signing key as returned by the IAS JWKS endpoint.
 *
 * TODO: An identical `JWK` type is also exported by `react-native-bcsc-core`
 * (packages/bcsc-core/src/NativeBcscCore.ts). Consolidate the two types when
 * core modules are refactored
 */
export interface JWK {
  kty: string
  e: string
  kid: string
  alg: string
  n: string
}
