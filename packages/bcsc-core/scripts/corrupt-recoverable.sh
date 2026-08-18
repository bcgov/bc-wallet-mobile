#!/usr/bin/env bash
#
# State 1 of 2 — recoverable.
#
# Removes `client_id` from account_metadata, leaving client_registration intact. v3 left client_id
# unset until registration completed, and 4.0.x force-cast it, which is what crashed on launch.
#
# Expected on current main: StorageService recovers clientID from client_registration, and the
# account survives — a verified user stays verified.
#
#   ./corrupt-recoverable.sh            apply
#   ./corrupt-recoverable.sh --restore  put the pristine account directory back
#
# A pristine copy is taken on first run and reused by --restore. Quit the app first.
set -euo pipefail

BID="${BID:-ca.bc.gov.iddev.servicescard}"
WORK="${WORK:-./.bcsc-corrupt}"
PRISTINE="$WORK/pristine"
STAGE="$WORK/stage"
REMOTE_ROOT="Library/Application Support"

DEVICE="${DEVICE:-$(xcrun devicectl list devices 2>/dev/null \
  | awk '$0 ~ /connected/ && $0 ~ /physical/ { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9A-F]{8}-/) print $i }')}"

if [ -z "$DEVICE" ] || [ "$(printf '%s' "$DEVICE" | grep -c .)" -ne 1 ]; then
  echo "error: need exactly one connected physical device (or set DEVICE=)."
  xcrun devicectl list devices 2>/dev/null | sed 's/^/  /'
  exit 1
fi

trap 'echo "aborted at line $LINENO" >&2' ERR

# devicectl reports failures on stdout, so capture both streams and surface them rather than
# letting set -e kill the script with no explanation.
pull_container() {
  local out
  rm -rf "$STAGE"
  mkdir -p "$STAGE"
  if ! out=$(xcrun devicectl device copy from --device "$DEVICE" \
    --domain-type appDataContainer --domain-identifier "$BID" \
    --source "$REMOTE_ROOT" --destination "$STAGE" 2>&1); then
    echo "error: could not pull the container from the device."
    printf '%s\n' "$out" | sed 's/^/  /'
    echo
    echo "  Check that the device is connected and unlocked, and that the installed build is"
    echo "  development-signed — App Store and TestFlight builds refuse container access."
    exit 1
  fi
}

# The container holds more than one tree; the app only reads the bundle-id scoped one.
# Picks the account the app will actually read. A container can hold several account directories;
# StorageService.currentAccountID takes accounts.first from account_list (it ignores `current`
# and never scans directories), so mirror exactly that.
#
# Diagnostics go to stderr: this runs inside $(...), so stdout is captured as the return value.
locate_account_dir() {
  python3 - "$STAGE/$BID" <<'PY'
import json, os, sys
root = sys.argv[1]
base = os.path.join(root, 'data', 'accounts_dir')
if not os.path.isdir(base):
    print(f"error: no data/accounts_dir under {root}", file=sys.stderr)
    print("  The app has not written an account yet — create one and retry.", file=sys.stderr)
    sys.exit(1)

found = []
for env in sorted(os.listdir(base)):
    listing = os.path.join(base, env, 'account_list')
    if not os.path.isfile(listing):
        continue
    try:
        with open(listing) as f:
            accounts = [a for a in (json.load(f).get('accounts') or []) if a]
    except Exception as exc:
        print(f"error: could not parse {listing}: {exc}", file=sys.stderr)
        sys.exit(1)
    if accounts:
        found.append((env, accounts))

if len(found) != 1:
    print(f"error: expected one environment holding accounts, found {len(found)}", file=sys.stderr)
    for env, accounts in found:
        print(f"    {env}: {accounts}", file=sys.stderr)
    sys.exit(1)

env, accounts = found[0]
current = accounts[0]
meta = os.path.join(base, env, current, 'account_metadata')
if not os.path.isfile(meta):
    print(f"error: account_metadata missing for {current} in {env}", file=sys.stderr)
    sys.exit(1)
if len(accounts) > 1:
    others = ', '.join(accounts[1:])
    print(f"note: {len(accounts)} accounts listed in {env}; the app reads the first", file=sys.stderr)
    print(f"      using   {current}", file=sys.stderr)
    print(f"      ignoring {others}", file=sys.stderr)
print(meta)
PY
}

push_dir() {
  local local_dir="$1" remote_dir="$2" out
  [ -n "$remote_dir" ] || { echo "error: empty remote path"; exit 1; }
  if ! out=$(xcrun devicectl device copy to --device "$DEVICE" \
    --domain-type appDataContainer --domain-identifier "$BID" \
    --source "$local_dir" --destination "$remote_dir" 2>&1); then
    echo "error: could not push to the device."
    printf '%s\n' "$out" | sed 's/^/  /'
    exit 1
  fi
}

report_state() {
  python3 - "$1" <<'PY'
import plistlib, sys, os
meta = sys.argv[1]
with open(meta, 'rb') as f:
    plist = plistlib.load(f)
has_cid = any(isinstance(o, dict) and 'client_id' in o for o in plist['$objects'])
reg = os.path.join(os.path.dirname(meta), 'client_registration')
print(f"  account_metadata client_id : {'present' if has_cid else 'ABSENT'}")
if not os.path.exists(reg):
    print("  client_registration        : file ABSENT")
else:
    with open(reg, 'rb') as f:
        rp = plistlib.load(f)
    has_reg_cid = any(isinstance(o, dict) and 'clientID' in o for o in rp['$objects'])
    print(f"  client_registration        : file present, clientID {'present' if has_reg_cid else 'ABSENT'}")
PY
}

echo "Device: $DEVICE"
echo "Bundle: $BID"
echo

echo "Pulling container ..."
pull_container
META=$(locate_account_dir)
ACCT_DIR=$(dirname "$META")
REMOTE_ACCT_DIR="$REMOTE_ROOT/$(dirname "${META#"$STAGE"/}")"
echo "  local:  $ACCT_DIR"
echo "  remote: $REMOTE_ACCT_DIR"
echo

if [ "${1:-}" = "--restore" ]; then
  if [ ! -d "$PRISTINE" ]; then
    echo "error: no pristine copy at $PRISTINE — nothing to restore."
    exit 1
  fi
  echo "Restoring pristine account directory ..."
  push_dir "$PRISTINE" "$REMOTE_ACCT_DIR"
  pull_container
  echo "State on device now:"
  VERIFY_META=$(locate_account_dir)
  report_state "$VERIFY_META"
  echo
  echo "Force-quit and relaunch the app; it should behave normally."
  exit 0
fi

# client_registration is only written once a credential exists — i.e. after verification
# completes — or inherited from a v3 migration. Without it there is nothing to recover from, so
# this would silently reproduce state 2 instead of state 1.
if [ ! -f "$ACCT_DIR/client_registration" ]; then
  echo "error: client_registration is not present on this device."
  echo
  echo "  It appears only after verification completes, or via a v3 migration. With no"
  echo "  recovery source, removing client_id reproduces state 2 (re-verification), not the"
  echo "  recoverable state this script is for."
  echo
  echo "  Finish verification and re-run, or test the unrecoverable state deliberately with:"
  echo "    ./corrupt-reverify.sh"
  exit 1
fi

if [ ! -d "$PRISTINE" ]; then
  echo "Saving pristine copy to $PRISTINE ..."
  mkdir -p "$PRISTINE"
  cp -R "$ACCT_DIR/." "$PRISTINE/"
else
  echo "Reusing existing pristine copy at $PRISTINE"
fi
echo

echo "Removing client_id from account_metadata ..."
python3 - "$META" <<'PY'
import plistlib, sys
path = sys.argv[1]
with open(path, 'rb') as f:
    plist = plistlib.load(f)
removed = 0
for obj in plist['$objects']:
    if isinstance(obj, dict) and 'client_id' in obj:
        del obj['client_id']
        removed += 1
if removed == 0:
    print("  client_id was already absent")
else:
    with open(path, 'wb') as f:
        plistlib.dump(plist, f, fmt=plistlib.FMT_BINARY)
    print(f"  removed client_id from {removed} object(s)")
PY
echo

echo "Pushing account directory ..."
push_dir "$ACCT_DIR" "$REMOTE_ACCT_DIR"
echo

echo "Verifying by re-reading the device ..."
pull_container
VERIFY_META=$(locate_account_dir)
report_state "$VERIFY_META"
echo
echo "Expected: client_id ABSENT, client_registration present."
echo
echo "Force-quit and relaunch the app. On current main it should recover clientID from"
echo "client_registration and behave normally — a verified user stays verified."
echo "Watch for: readData: repaired empty Account.clientID from client_registration"
echo
echo "Undo with: $0 --restore"
