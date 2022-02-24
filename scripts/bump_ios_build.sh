#!/bin/sh
set -xaou pipefail

# /usr/libexec/PlistBuddy \
# -c "Set :CFBundleVersion ${GITHUB_RUN_NUMBER}" "$1"

# /usr/libexec/PlistBuddy \
# -c "Set :CFBundleShortVersionString ${VERSION_STRING}" "$1"

agvtool new-version ${CURRENT_PROJECT_VERSION}
agvtool new-marketing-version ${MARKETING_VERSION}
