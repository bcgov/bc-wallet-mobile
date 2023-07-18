#!/bin/sh
set -xaou pipefail

CERT_PATH=$RUNNER_TEMP/certificates.p12
KC_NAME=cicd.keychain
KC_FILE_COUNT=$(find /Users/runner/Library/Keychains -iname $KC_NAME-db | wc -l | tr -d " ")

echo ">> Build Keychain Starting... 🤞"

echo ">> Extracting Artifats"

echo "${CERTIFICATE}" | base64 -d >"${CERT_PATH}"
md5 "$CERT_PATH"

if [[ $KC_FILE_COUNT -gt 0 ]]; then
  echo ">> Keychain $KC_NAME exists. Removing."
  /usr/bin/security delete-keychain /Users/runner/Library/Keychains/$KC_NAME-db
fi

echo ">> Create keychain $KC_NAME"
/usr/bin/security create-keychain -p $1 $KC_NAME
/usr/bin/security default-keychain -s $KC_NAME
/usr/bin/security unlock-keychain -p $1 $KC_NAME
/usr/bin/security list-keychains -d user -s $KC_NAME

echo ">> Importing Certificate"
/usr/bin/security import $CERT_PATH -P "$1" -t cert -f pkcs12 -k $KC_NAME -T /usr/bin/codesign -T /usr/bin/security

echo ">> Update Keychain Settings"
/usr/bin/security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k $1 $KC_NAME
/usr/bin/security set-keychain-settings -lut 21600 $KC_NAME

# # create temporary keychain
# security create-keychain -p "$1" $KEYCHAIN_PATH
# security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
# security unlock-keychain -p "$1" $KEYCHAIN_PATH

# # import certificate to keychain
# security import $CERT_PATH -P "$1" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
# security list-keychain -d user -s $KEYCHAIN_PATH

echo ">> Build Keychain Finished. 🤗"

exit 0
