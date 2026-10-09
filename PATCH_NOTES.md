### Patches

#### @credo-ts-anoncreds-npm-0.5.19-09c3e8bbd1.patch

Treat no-identifer requests as unqualified

#### @credo-ts-core-npm-0.5.19-0177059ca8.patch

One dif presentation bug fix for MDoc / OID4VC

#### @credo-ts-indy-vdr-npm-0.5.19-f8bd108d78.patch

Prevent error on agent restart when same IndyVDR pool is reused

#### @credo-ts-openid4vc-npm-0.5.19-4d16a6c35e.patch

Patches by Ontario team for various issues with openid4vc

#### @hyperledger-indy-vdr-react-native-npm-0.2.3-d7ed0b15da.patch

One patch to fix an edge with signed integers

#### @sphereon-pex-npm-3.3.3-144d9252ec.patch and @animo-id-pex-npm-4.1.1-alpha.0-f20edfffa2.patch

Fixes local-dev-only bug with yarn install (I don't know why an npm package wants to force pnpm usage, seems like they left this over from their local development)

#### react-native-date-picker-npm-5.0.13-e35e950566.patch

New architecture support and turbomodule fixes. We should swap this library out soon, maintainer is in hiding

#### react-native-fs-npm-2.20.0-a38fe24051.patch

Turbomodule fixes. We should swap this library out soon, hasn't been updated in four years.

#### @bifold-remote-logs-npm-3.1.3-757c19c437.patch

Gates `test`/`trace` log methods on their own levels instead of `debug` (so ledger lookups no longer flood the default dev log level), drops `console.trace` for the `trace` level (no more stack traces on routine logs), forces `LogLevel.Test` instead of `Debug` when remote logging is enabled (support sessions keep full detail), and tags `trace` lines with a `[TRACE]` console prefix so they stay distinguishable from `debug` in Metro. #4599

Upstream (Bifold `packages/remote-logs`): `src/logger.ts` L86 (remote-logging override), L187/L193 (`test`/`trace` gates); `src/transports/console.ts` L133-136 (`[TEST]` prefix block) and L146-150 (`console.trace` case). Tests to adjust when porting: `src/__tests__/console.transport.test.ts` L18 (mocks `console.trace`), `src/__tests__/logger.comprehensive.test.ts` L44 (hardcodes `logLevel = 2`). Drop this patch once the upstream fix lands.

#### react-native-vision-camera-npm-5.2.3-cdc12318c5.patch

Three independent changes; drop each on its own once upstream ships an equivalent.

**Per-output `mirrorMode` (JS: `useCameraController`, `src` and `lib`).** Lets `mirrorMode` on `<Camera>`/`useCamera` be a function that returns the mode per output. v5 otherwise applies one mode to every output, including the preview, so a mirrored selfie preview forces mirrored saved photos and videos. We keep the preview mirrored and save un-mirrored, so text held up reads correctly for ID Check. Pass a memoized function, because it's an effect dependency. Drop when v5 adds per-output mirroring to `<Camera>`.

**iOS camera teardown stall (native: `ios/Hybrid Objects/HybridCameraSession.swift`, `ios/Hybrid Objects/Views/HybridPreviewView.swift`).** With v5 tearing down a camera screen can stall the iOS main thread for seconds. AVFoundation blocks on the main thread inside `stopRunning`/`commitConfiguration` while a preview layer is attached (measured on an iPhone 13, iOS 26.6: a 9 s timeout), and it takes the session lock inside CoreAnimation's visibility callback (`-[AVCaptureVideoPreviewLayer layerDidBecomeVisible:]`, called with the CA tree lock held). Every `<Camera>` unmount raced the two: React Native removed the preview view on the main thread while the JS teardown ran `stop()`/`configure([])` on the session queue, so the main thread waited for the session lock and the session queue waited for the main thread until the timeout. The permanent freeze first put down to this was the exception in the next entry. No released version fixes this; 5.2.3 is the latest and upstream `main` is identical here. The patch is an ordering fix, no new locks: `configure()`, `start()` and `stop()` are queued on the session queue only after the main queue has drained what was already pending (`afterMainOnSessionQueue`), so a mutation never overlaps the view removal or insertion that preceded it, and `HybridPreviewView.updatePreviewLayer` does its CoreAnimation work inline when already on the main thread, so the layer joins the tree inside the same mount transaction that inserts the view, before any session mutation queued afterwards can attach a session to it. Verified with a mount/unmount stress harness on an iPhone 13 (iOS 26.6): with the main thread blocked, AVFoundation's `stopRunning` and `commitConfiguration` took exactly 9 s each; with the ordering fix every mode ran clean and the main thread never stalled. A residual one-in-forty 9 s wait inside `stopRunning` right after a photo capture remains on iOS 26.6 with the main thread free (unpatched: one in ten); it is a different AVFoundation wait, not this cycle, and the UI stays responsive. Waiting for the session queue from the main thread is not an option (tried: AVFoundation's own main-thread waits turn it into 9 s stalls). Drop when an upstream release orders session mutations after view mounting.

**KVO-compliant preview attach (native: `ios/Extensions/AVFoundation/AVCaptureSession+addOutputWithNoConnections.swift`).** v5 attaches the preview layer with `setSessionWithNoConnection`, which changes `session` without a KVO notification, and detaches it with `session = nil`, which sends one. An observer of a key path through `session` that registered while the layer had no session is left bound to nothing, and the detach then throws `NSInternalInconsistencyException` ("the value for the key "session" has changed without an appropriate KVO notification being sent") on the session queue. Nothing in the app observes a key path through `session`, but Sauce Labs' image-injection library does (`superlayer.session.running`), so in an injection-enabled iOS session a camera unmount ended in that exception, which Sauce's instrumentation turns into a frozen app instead of a crash. The patch wraps the attach in `willChangeValue(forKey:)`/`didChangeValue(forKey:)`, a no-op without observers. Reproduced outside the app with a sublayer observing `superlayer.session.running`: the plain attach followed by `session = nil` throws, the wrapped one runs clean. Drop when upstream attaches the preview layer with KVO notifications.

#### react-native-video-npm-6.19.2-1043ec3883.patch

**Android:** `ReactExoplayerView` builds against media3 1.9.0, the version VisionCamera v5's CameraX forces app-wide (see `RNVideo_media3Version` in `app/android/build.gradle`).

**iOS:** react-native-video never manages the audio session in this app. `AudioSessionManager` is force-disabled by default, and activation/deactivation respect that flag. A player registers, and configures the session for playback, in `init`, before its `disableAudioSessionManagement` prop is applied. Its `setActive(true/false)` calls also ignored the flag. On the selfie-video review screen, that silenced the camera's microphone, so every Retake recorded digital silence. Only `VideoReviewScreen` uses react-native-video.
