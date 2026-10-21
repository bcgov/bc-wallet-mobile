import type { TransportFailureKind, TransportFailureReason } from '../transport-failure'

/**
 * Native error strings React Native hands the app for requests that fail before any HTTP response,
 * as the classifier sees them in `error.request.responseText`. Hosts are example.com documentation
 * names, never an environment host. Shared by the unit tests and the developer error screen, which
 * replays each row through the real API client.
 *
 * Sources: OkHttp 4 and Conscrypt messages (Android), NSURLError `localizedDescription` (iOS, English
 * locale), axios' own timeout text. `redacted` is the exact `transport_detail` the report receives.
 */
export interface NativeTransportFailureSample {
  id: string
  platform: 'android' | 'ios' | 'axios'
  code: 'ERR_NETWORK' | 'ECONNABORTED'
  text: string
  kind: TransportFailureKind
  reason: TransportFailureReason
  redacted: string
}

export const NATIVE_TRANSPORT_FAILURE_SAMPLES: readonly NativeTransportFailureSample[] = [
  // ---- Android: TLS ----
  {
    id: 'android-hostname-mismatch',
    platform: 'android',
    code: 'ERR_NETWORK',
    text:
      'Hostname id.example.com not verified:\n' +
      '    certificate: sha256/AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789=\n' +
      '    DN: CN=other.example.com,O=Example Org,ST=British Columbia,C=CA\n' +
      '    subjectAltNames: [other.example.com, www.other.example.com]',
    kind: 'tls',
    reason: 'tls_hostname_mismatch',
    redacted: 'Hostname <host> not verified:',
  },
  {
    id: 'android-untrusted-root',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.',
    kind: 'tls',
    reason: 'tls_untrusted_root',
    redacted: 'CertPathValidatorException: Trust anchor for certification path not found.',
  },
  {
    id: 'android-chain-invalid',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Chain validation failed',
    kind: 'tls',
    reason: 'tls_chain_invalid',
    redacted: 'Chain validation failed',
  },
  {
    id: 'android-pin-failure',
    platform: 'android',
    code: 'ERR_NETWORK',
    text:
      'Certificate pinning failure!\n' +
      '  Peer certificate chain:\n' +
      '    sha256/AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789AbCdEf0123456789=: CN=id.example.com\n' +
      '  Pinned certificates for id.example.com:\n' +
      '    sha256/ZyXwVu9876543210ZyXwVu9876543210ZyXwVu9876543210ZyXwVu9876543210=',
    kind: 'tls',
    reason: 'tls_pin_failure',
    redacted: 'Certificate pinning failure!',
  },
  {
    id: 'android-pin-verification-failed',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Pin verification failed',
    kind: 'tls',
    reason: 'tls_pin_failure',
    redacted: 'Pin verification failed',
  },
  {
    id: 'android-handshake-no-message',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Error while executing request: SSLHandshakeException',
    kind: 'tls',
    reason: 'tls_handshake_failed',
    redacted: 'Error while executing request: SSLHandshakeException',
  },
  {
    id: 'android-handshake-failed',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'javax.net.ssl.SSLHandshakeException: Handshake failed',
    kind: 'tls',
    reason: 'tls_handshake_failed',
    redacted: 'SSLHandshakeException: Handshake failed',
  },
  // ---- Android: timeouts ----
  {
    id: 'android-call-timeout',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'timeout',
    kind: 'timeout',
    reason: 'timeout',
    redacted: 'timeout',
  },
  {
    id: 'android-read-timeout',
    platform: 'android',
    code: 'ECONNABORTED',
    text: 'Read timed out',
    kind: 'timeout',
    reason: 'timeout',
    redacted: 'Read timed out',
  },
  {
    id: 'android-connect-timeout',
    platform: 'android',
    code: 'ECONNABORTED',
    text: 'failed to connect to id.example.com/203.0.113.10 (port 443) from /10.0.0.7 (port 51234) after 10000ms',
    kind: 'timeout',
    reason: 'timeout_connect',
    redacted: 'failed to connect to <host>/<host> (port 443) from /<host> (port 51234) after 10000ms',
  },
  // ---- Android: connection problems, including the Conscrypt strings that only look like TLS ----
  {
    id: 'android-connect-failed',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Failed to connect to id.example.com/203.0.113.10:443',
    kind: 'connection',
    reason: 'connection_failed',
    redacted: 'Failed to connect to <host>/<host>:443',
  },
  {
    id: 'android-connection-reset',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Connection reset',
    kind: 'connection',
    reason: 'connection_reset',
    redacted: 'Connection reset',
  },
  {
    id: 'android-broken-pipe',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Broken pipe',
    kind: 'connection',
    reason: 'connection_reset',
    redacted: 'Broken pipe',
  },
  {
    id: 'android-ssl-read-error-abort',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Read error: ssl=0x7b3c8a1200: I/O error during system call, Software caused connection abort',
    kind: 'connection',
    reason: 'connection_aborted',
    redacted: 'Read error: ssl=0x<ptr>: I/O error during system call, Software caused connection abort',
  },
  {
    id: 'android-ssl-handshake-aborted-reset',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'SSL handshake aborted: ssl=0x7b3c8a1200: I/O error during system call, Connection reset by peer',
    kind: 'connection',
    reason: 'connection_reset',
    redacted: 'SSL handshake aborted: ssl=0x<ptr>: I/O error during system call, Connection reset by peer',
  },
  {
    id: 'android-unexpected-eof',
    platform: 'android',
    code: 'ERR_NETWORK',
    text:
      'unexpected end of stream on Connection{id.example.com:443, proxy=DIRECT hostAddress=id.example.com/203.0.113.10:443 ' +
      'cipherSuite=TLS_AES_128_GCM_SHA256 protocol=http/1.1}',
    kind: 'connection',
    reason: 'connection_eof',
    redacted:
      'unexpected end of stream on Connection{<host>:443, proxy=DIRECT hostAddress=<host>/<host>:443 ' +
      'cipherSuite=TLS_AES_128_GCM_SHA256 protocol=http/1.1}',
  },
  {
    id: 'android-no-route',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'No route to host',
    kind: 'connection',
    reason: 'connection_failed',
    redacted: 'No route to host',
  },
  // ---- Android: offline / DNS (same text in both cases) ----
  {
    id: 'android-unresolved-host',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Unable to resolve host "id.example.com": No address associated with hostname',
    kind: 'offline',
    reason: 'dns_unresolved',
    redacted: 'Unable to resolve host "<host>": No address associated with hostname',
  },
  {
    id: 'android-network-unreachable',
    platform: 'android',
    code: 'ERR_NETWORK',
    text: 'Network is unreachable',
    kind: 'offline',
    reason: 'offline',
    redacted: 'Network is unreachable',
  },
  // ---- iOS: TLS (NSURLError -1202, -1201, -1203, -1200) ----
  {
    id: 'ios-certificate-invalid',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text:
      'The certificate for this server is invalid. You might be connecting to a server that is pretending to be ' +
      '“id.example.com” which could put your confidential information at risk.',
    kind: 'tls',
    reason: 'tls_certificate_invalid',
    redacted:
      'The certificate for this server is invalid. You might be connecting to a server that is pretending to be ' +
      '“<host>” which could put your confidential information at risk.',
  },
  {
    id: 'ios-certificate-expired',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text:
      'The certificate for this server has expired. You might be connecting to a server that is pretending to be ' +
      '“id.example.com” which could put your confidential information at risk.',
    kind: 'tls',
    reason: 'tls_chain_invalid',
    redacted:
      'The certificate for this server has expired. You might be connecting to a server that is pretending to be ' +
      '“<host>” which could put your confidential information at risk.',
  },
  {
    id: 'ios-unknown-root',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text:
      'The certificate for this server was signed by an unknown certifying authority. You might be connecting to a ' +
      'server that is pretending to be “id.example.com” which could put your confidential information at risk.',
    kind: 'tls',
    reason: 'tls_untrusted_root',
    redacted:
      'The certificate for this server was signed by an unknown certifying authority. You might be connecting to a ' +
      'server that is pretending to be “<host>” which could put your confidential information at risk.',
  },
  {
    id: 'ios-ssl-error',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'An SSL error has occurred and a secure connection to the server cannot be made.',
    kind: 'tls',
    reason: 'tls_handshake_failed',
    redacted: 'An SSL error has occurred and a secure connection to the server cannot be made.',
  },
  // ---- iOS: timeout, connection, offline, DNS ----
  {
    id: 'ios-timed-out',
    platform: 'ios',
    code: 'ECONNABORTED',
    text: 'The request timed out.',
    kind: 'timeout',
    reason: 'timeout',
    redacted: 'The request timed out.',
  },
  {
    id: 'ios-cannot-connect',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'Could not connect to the server.',
    kind: 'connection',
    reason: 'connection_failed',
    redacted: 'Could not connect to the server.',
  },
  {
    id: 'ios-connection-lost',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'The network connection was lost.',
    kind: 'connection',
    reason: 'connection_lost',
    redacted: 'The network connection was lost.',
  },
  {
    id: 'ios-offline',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'The Internet connection appears to be offline.',
    kind: 'offline',
    reason: 'offline',
    redacted: 'The Internet connection appears to be offline.',
  },
  {
    id: 'ios-cannot-find-host',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'A server with the specified hostname could not be found.',
    kind: 'offline',
    reason: 'dns_unresolved',
    redacted: 'A server with the specified hostname could not be found.',
  },
  // ---- axios' own timeout text (a configured request timeout) and an unrecognised, localized string ----
  {
    id: 'axios-timeout-configured',
    platform: 'axios',
    code: 'ECONNABORTED',
    text: 'timeout of 10000ms exceeded',
    kind: 'timeout',
    reason: 'timeout',
    redacted: 'timeout of 10000ms exceeded',
  },
  {
    id: 'ios-localized-unknown',
    platform: 'ios',
    code: 'ERR_NETWORK',
    text: 'Le certificat de ce serveur est invalide.',
    kind: 'unknown',
    reason: 'unknown',
    redacted: 'Le certificat de ce serveur est invalide.',
  },
]
