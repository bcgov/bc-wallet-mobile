import NetInfo from '@react-native-community/netinfo'
import { AxiosError } from 'axios'
import { NATIVE_TRANSPORT_FAILURE_SAMPLES } from './__fixtures__/transport-failures'
import {
  classifyTransportFailure,
  classifyTransportText,
  getNetworkSnapshot,
  getTransportFailureText,
  redactTransportDetail,
  TRANSPORT_DETAIL_MAX_LENGTH,
} from './transport-failure'

const HOST = 'id.example.com'

// What React Native leaves on the XMLHttpRequest axios attaches to the error
const xhrWith = (responseText: string, responseType = '') => ({ responseType, responseText })

const samples = NATIVE_TRANSPORT_FAILURE_SAMPLES.map((sample) => [sample.id, sample] as const)

describe('transport-failure', () => {
  describe('classifyTransportText', () => {
    it.each(samples)('classifies %s', (_id, sample) => {
      expect(classifyTransportText(sample.text)).toEqual({ kind: sample.kind, reason: sample.reason })
    })

    it('returns unknown for empty or missing text', () => {
      expect(classifyTransportText(undefined)).toEqual({ kind: 'unknown', reason: 'unknown' })
      expect(classifyTransportText('')).toEqual({ kind: 'unknown', reason: 'unknown' })
    })

    // Conscrypt reports plain network drops with TLS vocabulary; they must never become "unsecured network"
    it('does not classify a dropped connection with ssl in the text as a TLS failure', () => {
      expect(
        classifyTransportText(
          'Read error: ssl=0x7b3c8a1200: I/O error during system call, Software caused connection abort'
        )
      ).toEqual({ kind: 'connection', reason: 'connection_aborted' })
      expect(
        classifyTransportText(
          'SSL handshake aborted: ssl=0x7b3c8a1200: I/O error during system call, Connection reset by peer'
        )
      ).toEqual({ kind: 'connection', reason: 'connection_reset' })
      expect(classifyTransportText('Write error: ssl=0x7b3c8a1200: I/O error during system call, Broken pipe')).toEqual(
        {
          kind: 'connection',
          reason: 'connection_reset',
        }
      )
    })

    it('prefers the connect-timeout reading over the generic failed-to-connect one', () => {
      expect(
        classifyTransportText(
          'failed to connect to id.example.com/203.0.113.10 (port 443) from /10.0.0.7 (port 51234) after 10000ms'
        )
      ).toEqual({ kind: 'timeout', reason: 'timeout_connect' })
      expect(classifyTransportText('Failed to connect to id.example.com/203.0.113.10:443')).toEqual({
        kind: 'connection',
        reason: 'connection_failed',
      })
    })
  })

  describe('redactTransportDetail', () => {
    it.each(samples)('redacts %s', (_id, sample) => {
      const redacted = redactTransportDetail(sample.text)

      expect(redacted).toBe(sample.redacted)
      expect(redacted).not.toContain('\n')
      expect(redacted).not.toContain(HOST)
      expect(redacted.length).toBeLessThanOrEqual(TRANSPORT_DETAIL_MAX_LENGTH)
    })

    it('replaces IPv4, IPv6 and bracketed IPv6 addresses', () => {
      expect(redactTransportDetail('Failed to connect to id.example.com/203.0.113.10:443')).toBe(
        'Failed to connect to <host>/<host>:443'
      )
      expect(redactTransportDetail('Failed to connect to id.example.com/2001:db8::1:443')).toBe(
        'Failed to connect to <host>/<host>'
      )
      expect(redactTransportDetail('Failed to connect to [2001:db8::1]:443')).toBe('Failed to connect to <host>:443')
    })

    it('keeps the simple name of a package-qualified Java exception', () => {
      expect(
        redactTransportDetail('javax.net.ssl.SSLPeerUnverifiedException: Hostname id.example.com not verified:')
      ).toBe('SSLPeerUnverifiedException: Hostname <host> not verified:')
    })

    it('neutralises pointers, collapses whitespace and caps the length', () => {
      expect(redactTransportDetail('Read error:   ssl=0x7b3c8a1200:\tfailed')).toBe('Read error: ssl=0x<ptr>: failed')
      expect(redactTransportDetail('x'.repeat(TRANSPORT_DETAIL_MAX_LENGTH + 50))).toHaveLength(
        TRANSPORT_DETAIL_MAX_LENGTH
      )
    })

    it('drops everything after the first line', () => {
      expect(redactTransportDetail('first line\nsubjectAltNames: [id.example.com]')).toBe('first line')
    })
  })

  describe('getTransportFailureText', () => {
    it.each(['', 'text', undefined])('reads the native text from a request with responseType %p', (responseType) => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, {
        responseType,
        responseText: 'Chain validation failed',
      })

      expect(getTransportFailureText(error)).toBe('Chain validation failed')
    })

    it('does not read a binary response type, where RN stores nothing and the getter throws', () => {
      const request = {
        responseType: 'arraybuffer',
        get responseText(): string {
          throw new Error('responseText is only available for text responses')
        },
      }

      expect(
        getTransportFailureText(new AxiosError('Network Error', 'ERR_NETWORK', undefined, request))
      ).toBeUndefined()
    })

    it('survives a throwing responseText getter', () => {
      const request = {
        responseType: '',
        get responseText(): string {
          throw new Error('boom')
        },
      }

      expect(
        getTransportFailureText(new AxiosError('Network Error', 'ERR_NETWORK', undefined, request))
      ).toBeUndefined()
    })

    it('returns undefined for the generic axios message without a request', () => {
      expect(getTransportFailureText(new AxiosError('Network Error', 'ERR_NETWORK'))).toBeUndefined()
    })

    it("uses axios' own timeout message when the request has no native text", () => {
      const error = new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED', undefined, xhrWith(''))

      expect(getTransportFailureText(error)).toBe('timeout of 10000ms exceeded')
    })
  })

  describe('classifyTransportFailure', () => {
    it('returns undefined when a response exists', () => {
      const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, xhrWith('ignored'), {
        status: 500,
      } as any)

      expect(classifyTransportFailure(error)).toBeUndefined()
    })

    it('returns undefined for codes that are not transport failures', () => {
      expect(classifyTransportFailure(new AxiosError('Bad request', 'ERR_BAD_REQUEST'))).toBeUndefined()
    })

    it('classifies and redacts a network error', () => {
      const sample = NATIVE_TRANSPORT_FAILURE_SAMPLES.find((s) => s.id === 'android-hostname-mismatch')!
      const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, xhrWith(sample.text))

      expect(classifyTransportFailure(error)).toEqual({
        kind: 'tls',
        reason: 'tls_hostname_mismatch',
        detail: 'Hostname <host> not verified:',
      })
    })

    it('reports unknown without a detail when nothing was captured', () => {
      expect(classifyTransportFailure(new AxiosError('Network Error', 'ERR_NETWORK'))).toEqual({
        kind: 'unknown',
        reason: 'unknown',
      })
    })

    it('keeps an unrecognised native string as a redacted detail', () => {
      const error = new AxiosError(
        'Network Error',
        'ERR_NETWORK',
        undefined,
        xhrWith('Le certificat de ce serveur est invalide.')
      )

      expect(classifyTransportFailure(error)).toEqual({
        kind: 'unknown',
        reason: 'unknown',
        detail: 'Le certificat de ce serveur est invalide.',
      })
    })

    it('treats an aborted request as a timeout whatever the native text says', () => {
      expect(classifyTransportFailure(new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'))).toEqual({
        kind: 'timeout',
        reason: 'timeout',
        detail: 'timeout of 10000ms exceeded',
      })
      expect(classifyTransportFailure(new AxiosError('Request aborted', 'ECONNABORTED'))).toEqual({
        kind: 'timeout',
        reason: 'timeout',
        detail: 'Request aborted',
      })
      expect(
        classifyTransportFailure(
          new AxiosError(
            'Network Error',
            'ECONNABORTED',
            undefined,
            xhrWith(
              'failed to connect to id.example.com/203.0.113.10 (port 443) from /10.0.0.7 (port 51234) after 10000ms'
            )
          )
        )
      ).toMatchObject({ kind: 'timeout', reason: 'timeout_connect' })
    })
  })

  describe('getNetworkSnapshot', () => {
    beforeEach(() => {
      jest.mocked(NetInfo.fetch).mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: null,
        details: { ssid: 'personal data that must not be captured' },
      } as any)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('returns only the connectivity flags and the connection type', async () => {
      await expect(getNetworkSnapshot()).resolves.toEqual({
        net_connected: true,
        net_reachable: null,
        net_type: 'wifi',
      })
    })

    it('returns an empty snapshot when NetInfo rejects', async () => {
      jest.mocked(NetInfo.fetch).mockRejectedValueOnce(new Error('native module unavailable'))

      await expect(getNetworkSnapshot()).resolves.toEqual({})
    })

    it('returns an empty snapshot when NetInfo does not answer in time', async () => {
      jest.useFakeTimers()
      jest.mocked(NetInfo.fetch).mockReturnValueOnce(new Promise(() => {}))

      const snapshot = getNetworkSnapshot()
      await jest.advanceTimersByTimeAsync(1000)

      await expect(snapshot).resolves.toEqual({})
    })
  })
})
