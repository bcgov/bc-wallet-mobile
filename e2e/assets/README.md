# E2E Test Assets

Static image files used by camera injection helpers during E2E tests.

## Conventions

| File                | Purpose                                            | Format             |
| ------------------- | -------------------------------------------------- | ------------------ |
| `dl_*.jpg`          | Driver's licence photos                            | JPG or PNG, ≤ 5 MB |
| `id_*.jpg`          | BC Services Card / ID photos                       | JPG or PNG, ≤ 5 MB |
| `passport.jpg`      | Passport photo                                     | JPG or PNG, ≤ 5 MB |
| `scan/card_*.png`   | Generated combo-card backs, for SCANNING not photos | PNG, ≤ 5 MB        |

The `scan/` images are **generated, not photographed** — `scripts/generate-scan-assets.mjs` writes one
card back per BCSC persona carrying that persona's own serial (code-39) and birthdate (PDF-417). Rerun
the script rather than editing them by hand. See the e2e README's "Scanning from injection" section
for the authoring rules they follow.

## Image Requirements (Sauce Labs)

- **Format:** JPG, JPEG, or PNG
- **Max size:** 5 MB

## Usage

```typescript
import { injectPhoto } from '../src/helpers/camera.js'
import { CARD_SCAN_PADDING } from '../src/constants.js'

// Driver's licence capture — resolves to e2e/assets/images/dl_velma.jpg
await injectPhoto('images/dl_velma.jpg', CARD_SCAN_PADDING)

// ID card capture — resolves to e2e/assets/images/id_shaggy.jpg
await injectPhoto('images/id_shaggy.jpg', { top: 0, right: 0, bottom: 0, left: 0 })
```
