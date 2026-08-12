#!/bin/sh
set -eau -o pipefail

PP_DIR=~/Library/MobileDevice/Provisioning\ Profiles

echo ">> Build Provisioning Profile... 🤞"
echo ">> Provisioning Profile Home = ${PP_DIR}"

UUID=$(/usr/libexec/plistbuddy -c Print:UUID /dev/stdin <<< `security cms -D -i "${PROVISIONING_PROFILE_FILE}"`)
mkdir -p "${PP_DIR}"
cp "${PROVISIONING_PROFILE_FILE}" "${PP_DIR}/${UUID}.mobileprovision"
md5 "${PP_DIR}/${UUID}.mobileprovision"

echo ">> Build Provisioning Profile. 🤗"

exit 
