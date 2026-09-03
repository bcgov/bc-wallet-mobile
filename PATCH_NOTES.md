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

#### @bifold-remote-logs-npm-3.0.21-4ae200989a.patch

Gates `test`/`trace` log methods on their own levels instead of `debug` (so ledger lookups no longer flood the default dev log level), drops `console.trace` for the `trace` level (no more stack traces on routine logs), and forces `LogLevel.test` instead of `debug` when remote logging is enabled (support sessions keep full detail). #4599

Upstream (Bifold `packages/remote-logs`): `src/logger.ts` L86 (remote-logging override), L187/L193 (`test`/`trace` gates); `src/transports/console.ts` L146-148 (`console.trace`). Tests to adjust when porting: `src/__tests__/console.transport.test.ts` L18 (mocks `console.trace`), `src/__tests__/logger.comprehensive.test.ts` L44 (hardcodes `logLevel = 2`). Drop this patch once the upstream fix lands.
