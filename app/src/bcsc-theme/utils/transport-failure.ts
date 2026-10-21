import NetInfo from '@react-native-community/netinfo'
import { AxiosError } from 'axios'

/**
 * Classification of an HTTP request that failed before any response came back.
 *
 * React Native hands axios a bare `Event('error')` for every transport failure, so axios can only say
 * "Network Error" (`ERR_NETWORK`). The native reason (OkHttp/Conscrypt on Android, NSURLError
 * `localizedDescription` on iOS) is still available on the XMLHttpRequest object axios attaches as
 * `error.request`: RN stores it in `responseText`. This module reads that text and reduces it to a
 * small, host-free vocabulary so TLS failures, timeouts and dropped connections stop looking like
 * "device offline" in the error modal, the logs and the incident report.
 */
export type TransportFailureKind = 'tls' | 'timeout' | 'connection' | 'offline' | 'unknown'

export type TransportFailureReason =
  | 'tls_hostname_mismatch'
  | 'tls_untrusted_root'
  | 'tls_chain_invalid'
  | 'tls_pin_failure'
  | 'tls_certificate_invalid'
  | 'tls_handshake_failed'
  | 'timeout'
  | 'timeout_connect'
  | 'connection_refused'
  | 'connection_reset'
  | 'connection_aborted'
  | 'connection_eof'
  | 'connection_lost'
  | 'connection_failed'
  | 'offline'
  | 'dns_unresolved'
  | 'unknown'

export interface TransportFailure {
  kind: TransportFailureKind
  /** Host-free token; the only part that may reach the UI. */
  reason: TransportFailureReason
  /** Redacted first line of the native text (hosts and IPs replaced, ≤ 256 chars). Absent when nothing was captured. */
  detail?: string
}

/** The axios message when the runtime gave it no reason at all. */
export const AXIOS_GENERIC_NETWORK_MESSAGE = 'Network Error'

/** axios codes meaning "the request left the device and no HTTP response came back". */
export const NO_RESPONSE_TRANSPORT_CODES: ReadonlySet<string> = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'])

export const isNoResponseTransportCode = (code?: string): boolean =>
  code !== undefined && NO_RESPONSE_TRANSPORT_CODES.has(code)

/**
 * Ordered, first match wins: specific TLS, then timeout, then connection, then offline/DNS, then the
 * generic TLS handshake patterns last.
 *
 * The order matters. Conscrypt reports plain network drops with TLS vocabulary ("Read error: ssl=0x…:
 * I/O error during system call, Software caused connection abort", "SSL handshake aborted: … Connection
 * reset by peer"), so the connection patterns must win over the generic handshake pattern. OkHttp's
 * connect timeout starts with "failed to connect to … after 10000ms", so the timeout patterns must win
 * over the connection ones. Add a fixture row and a test for every new string.
 */
const TRANSPORT_FAILURE_PATTERNS: ReadonlyArray<readonly [RegExp, TransportFailureKind, TransportFailureReason]> = [
  // TLS, specific. Android: OkHttp hostname verifier, Conscrypt trust manager, pinning. iOS: NSURLError -1201…-1203.
  [/\bHostname .+ not verified/i, 'tls', 'tls_hostname_mismatch'],
  [
    /Trust anchor for certification path not found|signed by an unknown certifying authority/i,
    'tls',
    'tls_untrusted_root',
  ],
  [/Chain validation failed|certificate for this server (has expired|is not yet valid)/i, 'tls', 'tls_chain_invalid'],
  [/Certificate pinning failure|Pin verification failed/i, 'tls', 'tls_pin_failure'],
  [/certificate for this server is invalid/i, 'tls', 'tls_certificate_invalid'],
  // Timeout. "timeout" alone is OkHttp's call timeout (an axios timeout on Android); the rest are axios, OkHttp and iOS.
  [/^timeout$|\btimeout( of \d+ ?ms)? exceeded\b|Read timed out|The request timed out/i, 'timeout', 'timeout'],
  [/failed to connect to .+ after \d+ ?ms|Connection timed out/i, 'timeout', 'timeout_connect'],
  // Connection dropped, refused or never established.
  [/Connection refused/i, 'connection', 'connection_refused'],
  [/Connection reset|Broken pipe/i, 'connection', 'connection_reset'],
  [/Software caused connection abort/i, 'connection', 'connection_aborted'],
  [/unexpected end of stream/i, 'connection', 'connection_eof'],
  [/The network connection was lost/i, 'connection', 'connection_lost'],
  [
    /^(Read|Write) error: ssl=|Failed to connect to|Could not connect to the server|No route to host/i,
    'connection',
    'connection_failed',
  ],
  // Offline or DNS. Android uses the same text when offline and when the lookup really fails; the
  // NetInfo snapshot attached next to the classification tells the two apart.
  [/Unable to resolve host|hostname could not be found/i, 'offline', 'dns_unresolved'],
  [/Internet connection appears to be offline|Network is unreachable/i, 'offline', 'offline'],
  // TLS, generic, last. RN sends "Error while executing request: SSLHandshakeException" when the exception has no message.
  [
    /SSLHandshakeException|SSLPeerUnverifiedException|SSLException|Handshake failed|An SSL error has occurred/i,
    'tls',
    'tls_handshake_failed',
  ],
]

// Long enough for Apple's full "pretending to be" sentence once the host is replaced
export const TRANSPORT_DETAIL_MAX_LENGTH = 256

const HOST_PLACEHOLDER = '<host>'
// Package-qualified Java class names ("java.security.cert.CertPathValidatorException") keep their simple
// name so they are not mistaken for hostnames below.
const JAVA_CLASS_PATTERN = /\b(?:[a-z_][a-z0-9_]*\.)+([A-Z][A-Za-z0-9_]*)\b/g
const IPV6_PATTERN = /\[[0-9a-f:.]+\]|\b(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{1,4}\b/gi
const IPV4_PATTERN = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g
const HOST_PATTERN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]+\b/gi
const POINTER_PATTERN = /0x[0-9a-f]+/gi

/**
 * Make a native error string safe for remote logs and incident reports: first line only (Android appends
 * the whole certificate dump on the following lines), hostnames and IP addresses replaced, memory
 * pointers neutralised, whitespace collapsed, length capped. Over-redaction is acceptable; a leaked
 * environment hostname is not.
 */
export const redactTransportDetail = (text: string): string => {
  const [firstLine] = text.split(/\r?\n/)

  return firstLine
    .replace(JAVA_CLASS_PATTERN, '$1')
    .replace(IPV6_PATTERN, HOST_PLACEHOLDER)
    .replace(IPV4_PATTERN, HOST_PLACEHOLDER)
    .replace(HOST_PATTERN, HOST_PLACEHOLDER)
    .replace(POINTER_PATTERN, '0x<ptr>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TRANSPORT_DETAIL_MAX_LENGTH)
}

type NativeXhr = { responseType?: string; responseText?: string } | null | undefined

/**
 * The native reason RN stashed on the XMLHttpRequest, when there is one.
 *
 * RN only stores it for the text response types, and the `responseText` getter throws for binary ones
 * (`arraybuffer`, `blob`), hence the guard. Falls back to the axios message when it is not the generic
 * one (axios' own timeout text, or an `event.message` on runtimes that provide it).
 */
export const getTransportFailureText = (error: AxiosError): string | undefined => {
  const xhr = error.request as NativeXhr

  try {
    if (xhr && (xhr.responseType === undefined || xhr.responseType === '' || xhr.responseType === 'text')) {
      const text = xhr.responseText
      if (typeof text === 'string' && text.trim().length > 0) {
        return text
      }
    }
  } catch {
    // Binary response type: nothing was stored for this request
  }

  return error.message && error.message !== AXIOS_GENERIC_NETWORK_MESSAGE ? error.message : undefined
}

export const classifyTransportText = (text?: string): Pick<TransportFailure, 'kind' | 'reason'> => {
  if (text) {
    for (const [pattern, kind, reason] of TRANSPORT_FAILURE_PATTERNS) {
      if (pattern.test(text)) {
        return { kind, reason }
      }
    }
  }

  return { kind: 'unknown', reason: 'unknown' }
}

/**
 * Classify an axios failure that produced no HTTP response.
 *
 * @returns undefined when a response exists or the axios code is not a no-response transport code
 */
export const classifyTransportFailure = (error: AxiosError): TransportFailure | undefined => {
  if (error.response || !isNoResponseTransportCode(error.code)) {
    return undefined
  }

  const text = getTransportFailureText(error)
  const classified = classifyTransportText(text)
  const detail = text ? redactTransportDetail(text) : undefined

  if (error.code !== 'ERR_NETWORK') {
    // axios' own timeout path (iOS, or a configured axios timeout): the kind is certain even when the
    // native text says nothing useful; keep the finer reason only when the text confirms a timeout
    const reason = classified.kind === 'timeout' ? classified.reason : 'timeout'
    return detail ? { kind: 'timeout', reason, detail } : { kind: 'timeout', reason }
  }

  return detail ? { ...classified, detail } : classified
}

// A type alias rather than an interface so it can be spread into the AppError context
export type NetworkSnapshot = {
  net_connected?: boolean | null
  net_reachable?: boolean | null
  net_type?: string
}

const NETWORK_SNAPSHOT_TIMEOUT_MS = 1000

/**
 * Connectivity flags at the moment of a transport failure, so a report can tell "device offline" from
 * "host unreachable". Only the flags and the connection type: `NetInfo.details` (SSID, BSSID, IP
 * address, carrier) is personal data and never leaves the device. Never throws and never waits longer
 * than a second.
 */
export const getNetworkSnapshot = async (): Promise<NetworkSnapshot> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const state = await Promise.race([
      NetInfo.fetch(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), NETWORK_SNAPSHOT_TIMEOUT_MS)
      }),
    ])

    if (!state) {
      return {}
    }

    return { net_connected: state.isConnected, net_reachable: state.isInternetReachable, net_type: state.type }
  } catch {
    return {}
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
