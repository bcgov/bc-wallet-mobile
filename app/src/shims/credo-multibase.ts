// This is required to make @credo-ts/core@0.5.13 work with @credo-ts/webvh@0.5.17-alpha-20250817083021
// because @credo-ts/webvh@0.5.17-alpha-20250817083021 uses the internal utils from @credo-ts/core@0.5.13
// and @credo-ts/core@0.5.13 does not export the internal utils.
// This is a temporary shim until BC wallet uses @credo-ts/core@0.5.17.

import * as core from '@credo-ts/core'
import { MultiBaseEncoder } from '@credo-ts/core/build/utils/MultiBaseEncoder'
import { MultiHashEncoder } from '@credo-ts/core/build/utils/MultiHashEncoder'

if (!(core as any).MultiBaseEncoder) {
  ;(core as any).MultiBaseEncoder = MultiBaseEncoder
}
if (!(core as any).MultiHashEncoder) {
  ;(core as any).MultiHashEncoder = MultiHashEncoder
}
