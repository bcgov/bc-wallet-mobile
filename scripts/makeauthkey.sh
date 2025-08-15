#!/bin/sh
set -xaou pipefail

KEY_PATH=$RUNNER_TEMP/AuthKey.p9

echo ">> Build API AuthKey Starting... 🤞"

echo "${AUTHKEY_P8}" >"${KEY_PATH}"
md5 "$KEY_PATH"

echo ">> Build API AuthKey Finished. 🤗"

exit 0
