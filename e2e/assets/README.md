# E2E Test Assets

Static image and video files used by camera/video injection helpers during E2E tests.

## Conventions

| File           | Purpose                                      | Format             |
| -------------- | -------------------------------------------- | ------------------ |
| `qr-*.png`     | QR code images for scanner tests             | PNG, ≤ 5 MB        |
| `id-*.jpg`     | ID card / evidence photos                    | JPG or PNG, ≤ 5 MB |
| `selfie-*.png` | Selfie / face images for liveness            | PNG, ≤ 5 MB        |
| `*.mp4`        | Pre-recorded videos for gallery upload flows | MP4                |

## Image Requirements (Sauce Labs)

- **Format:** JPG, JPEG, or PNG
- **Max size:** 5 MB
- **QR codes:** Add whitespace padding around the code if the app's scanner defines a small target area — Sauce Labs scales images linearly to fit the camera resolution

## Usage

```typescript
import { injectQRCode, injectPhoto } from '../src/helpers/camera.js'
import { injectVideoFrame, sustainedFrameInjection } from '../src/helpers/video.js'

// QR code scanning — resolves to e2e/assets/qr-invite.png
await injectQRCode('qr-invite.png')

// ID photo capture — resolves to e2e/assets/id-drivers-license.jpg
await injectPhoto('id-drivers-license.jpg')

// Video recording — inject face image as video frames for 8 seconds
await sustainedFrameInjection('selfie-liveness.png', { durationMs: 8_000 })
```
