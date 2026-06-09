import NetInfo from '@react-native-community/netinfo'

import { getRedactedNetworkDiagnostics, RedactedNetworkDiagnostics } from './axios-error-utils'

/**
 * Identifies which file failed in a multi-file upload batch. Attached to a rejected
 * upload error as a non-enumerable `__uploadCtx` so the catch site can report it without
 * threading context back through `Promise.all`.
 */
export interface UploadFileContext {
  kind: 'photo' | 'video' | 'document'
  /** Target host only — never the signed-URL path or query string. */
  host?: string
  sizeBytes: number
}

/** A redacted snapshot of network state taken at the moment of a failure. */
export interface NetworkStateSnapshot {
  isConnected: boolean | null
  isInternetReachable: boolean | null
  type: string
}

/**
 * Redacted, structured diagnostics for an upload failure. Safe to send to remote
 * logging — contains no auth headers, request/response bodies, or signed-URL queries.
 *
 * The index signature keeps this assignable to the logger's `Record<string, unknown>`
 * `data` parameter while preserving the documented shape.
 */
export type UploadFailureDiagnostics = {
  /** Which step of the upload flow was executing when the failure occurred. */
  stage: string
  /** The specific file that failed, when the failure came from a tagged upload. */
  file?: UploadFileContext
  /** Network state at the moment of failure — the key signal for distinguishing a
   * genuinely offline device from a host-specific transport failure (issue #4010). */
  network: NetworkStateSnapshot | null
  /** Wall-clock time from the start of the upload to the failure, when available. */
  elapsedMs?: number
  /** Transport-level axios detail (code, status, method, host). */
  axios: RedactedNetworkDiagnostics
  [key: string]: unknown
}

/**
 * Attaches per-file context to a rejected upload promise as a non-enumerable
 * `__uploadCtx`, then re-throws. Preserves `Promise.all` first-failure-wins semantics
 * (no added latency) while letting the catch site report which file failed.
 *
 * @param promise - The in-flight upload promise
 * @param context - Identifying context for this file
 * @returns The same promise, with failure context attached on rejection
 */
export const tagUploadFailure = <T>(promise: Promise<T>, context: UploadFileContext): Promise<T> =>
  promise.catch((error: unknown) => {
    if (error && typeof error === 'object') {
      try {
        Object.defineProperty(error, '__uploadCtx', { value: context, enumerable: false, configurable: true })
      } catch {
        // The rejection is frozen/sealed/non-extensible — skip tagging rather than let
        // defineProperty throw and replace the original upload failure cause.
      }
    }
    throw error
  })

/**
 * Takes a failure-time snapshot of network state via NetInfo. This is the key signal
 * for issue #4010: it tells us whether the device was *actually* offline at the moment
 * of failure, or whether only the specific upload host was unreachable.
 *
 * @returns The snapshot, or null if NetInfo could not be read.
 */
export const getNetworkStateSnapshot = async (): Promise<NetworkStateSnapshot | null> => {
  try {
    const state = await NetInfo.refresh()
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    }
  } catch {
    return null
  }
}

/**
 * Assembles redacted, structured diagnostics for an upload failure: the stage that
 * failed, which file (when tagged via {@link tagUploadFailure}), a failure-time network
 * snapshot, elapsed time, and transport-level axios detail.
 *
 * @param error - The error thrown by the failed upload
 * @param options - The current stage, and optionally the upload start time for elapsed
 * @returns A diagnostics object safe to pass as the logger's structured `data` argument
 */
export const buildUploadFailureDiagnostics = async (
  error: unknown,
  options: { stage: string; startedAt?: number }
): Promise<UploadFailureDiagnostics> => {
  const file = (error as { __uploadCtx?: UploadFileContext })?.__uploadCtx

  return {
    stage: options.stage,
    ...(file ? { file } : {}),
    network: await getNetworkStateSnapshot(),
    ...(options.startedAt !== undefined ? { elapsedMs: Date.now() - options.startedAt } : {}),
    axios: getRedactedNetworkDiagnostics(error),
  }
}
