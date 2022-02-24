#!/bin/sh
set -xaou pipefail

VERSION_STRING="1.0.1"

# /usr/libexec/PlistBuddy \
# -c "Set :CFBundleVersion ${GITHUB_RUN_NUMBER}" "$1"

# /usr/libexec/PlistBuddy \
# -c "Set :CFBundleShortVersionString ${VERSION_STRING}" "$1"

agvtool new-version ${GITHUB_RUN_NUMBER}
agvtool new-marketing-version ${VERSION_STRING}
