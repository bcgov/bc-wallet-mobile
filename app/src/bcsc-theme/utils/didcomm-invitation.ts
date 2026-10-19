import { isDidCommInvitation } from '@bifold/core'

/**
 * Checks if a URI may be a DIDComm invitation: either an explicit one (`didcomm://`, `?oob=`, `?c_i=`, ...)
 * or any http(s) URL, which Credo resolves as a shortened invitation (VC Authn, Traction short links, etc.).
 *
 * @param uri The URI to check
 * @returns True if the URI should be handed to Credo's `parseInvitation`, false otherwise
 */
export function isDidCommInvitationCandidate(uri: string): boolean {
  if (isDidCommInvitation(uri)) {
    return true
  }

  try {
    const { protocol } = new URL(uri)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}
