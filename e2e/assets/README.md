# E2E Test Assets

Static image files used by camera injection helpers during E2E tests.

## Conventions

| File           | Purpose                      | Format             |
| -------------- | ---------------------------- | ------------------ |
| `dl_*.jpg`     | Driver's licence photos      | JPG or PNG, ≤ 5 MB |
| `id_*.jpg`     | BC Services Card / ID photos | JPG or PNG, ≤ 5 MB |
| `passport.jpg` | Passport photo               | JPG or PNG, ≤ 5 MB |

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
