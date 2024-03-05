#!/bin/sh
set -euxo pipefail

PP_DIR=~/Library/MobileDevice/Provisioning\ Profiles

echo ">> Build Provisioning Profile... 🤞"
echo ">> Provisioning Profile Home = ${PP_DIR}"

UUID=$(/usr/libexec/plistbuddy -c Print:UUID /dev/stdin <<< `echo "${PROVISIONING_PROFILE}" | base64 -d | security cms -D`)
base64 -d <<< "${PROVISIONING_PROFILE}" >${UUID}.mobileprovision
md5 "${UUID}.mobileprovision"
mkdir -p "${PP_DIR}"
cp ${UUID}.mobileprovision "${PP_DIR}/"

echo ">> Build Provisioning Profile. 🤗"

exit 
