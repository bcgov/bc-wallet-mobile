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

## Help

Every command has examples under `--help`. Commands marked `not implemented` are placeholders for later work.

## Develop

```sh
cd scripts/bcsc-test
yarn test
yarn typecheck
```
