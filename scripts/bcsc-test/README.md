# bcsc-test

A command-line tool for driving BCSC test devices through the IAS mobile E2E test API. It follows the `gh` style: `bcsc-test <command> <subcommand> [flags]`.

It needs Node 24 and has no dependencies. It runs the TypeScript sources directly.

## Install

```sh
scripts/bcsc-test/install.sh
```

This copies the sources to `~/.local/share/bcsc-test` and puts a `bcsc-test` wrapper in `~/bin`, so the command keeps working when you switch branches. Run it again to pick up changes.

To run it from the checkout without installing, use `node scripts/bcsc-test/src/main.ts`.

## Log in

You need a client credential for the test API. Dev is the default host.

```sh
bcsc-test auth login                   # prompts for the client ID and secret, and keeps the secret in the macOS keychain
bcsc-test auth login --secret-source op --secret-ref "op://<vault>/<item>/credential"
echo "$CLIENT_ID:$CLIENT_SECRET" | bcsc-test auth login --with-secret
bcsc-test auth status                  # client, scopes and token expiry for each host
```

The client secret is never written to a file. Tokens are cached until they expire and refresh automatically. Setting `BCSC_TEST_TOKEN` overrides the stored login, and setting `BCSC_TEST_HOST` picks the host. For more, see `bcsc-test help environment`.

## Verify a device

Use the usercode the app shows while it waits for verification.

```sh
bcsc-test verification approve NCNF-ZNTB
bcsc-test verification decline NCNF-ZNTB --user-message "Photo unclear" --internal-comment "Test decline"
bcsc-test verification approve NCNF-ZNTB --dry-run   # print the request without sending it
```

The server records an approval as a counter visit. Only the `counter` channel is implemented on the server.

## Set the mobile app expiry

The date needs whole seconds and a UTC offset (`Z` works too); a date without one is rejected before anything is sent.

```sh
bcsc-test mobile-app set-expiry NCNF-ZNTB 2099-12-01T00:00:00-08:00
bcsc-test mobile-app set-expiry NCNF-ZNTB 2026-11-01T00:00:00-08:00   # a date already past forces the expired state
bcsc-test mobile-app set-expiry NCNF-ZNTB 2099-12-01T00:00:00-08:00 --dry-run
```

IAS accepts an expiry only while the mobile app is Activated. A date at or before the IAS server's current time marks the mobile app Expired, and nothing in the test API reverses that, so use a disposable usercode.

## Suspend or unsuspend the mobile app

```sh
bcsc-test mobile-app set-status NCNF-ZNTB --reason E2E1
bcsc-test mobile-app set-status NCNF-ZNTB --reason E2E1 --dry-run
```

IAS decides the new status: an Activated mobile app becomes Suspended and a Suspended one becomes Activated, so running the command again reverses it. IAS reports nothing on success, so check the device to see which way it went. The reason is a ticket reference of 1 to 25 letters or digits, with no spaces or punctuation.

## Help

Every command has examples under `--help`. Commands marked `not implemented` are placeholders for later work.

## Develop

```sh
cd scripts/bcsc-test
node --test 'src/**/*.test.ts'
../../node_modules/.bin/tsc -p .
```
