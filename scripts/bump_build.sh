#!/bin/sh
set -xaou pipefail

/usr/libexec/PlistBuddy \
-c "Set :CFBundleVersion ${GITHUB_RUN_NUMBER}" "$1"
