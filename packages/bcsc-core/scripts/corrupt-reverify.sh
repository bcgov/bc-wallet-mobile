#!/usr/bin/env bash
#
# State 2 of 2 — unrecoverable, re-verification required.
#
# Removes `client_id` from account_metadata AND strips the clientID out of client_registration,
# so there is nothing left to recover from. Run after corrupt-recoverable.sh to escalate, or on
# its own.
#
# The registration is gutted rather than deleted: devicectl copies merge, so a locally deleted
# file would simply stay on the device. Either way the repair finds no clientID.
#
# Expected on current main: no recovery source, clientID stays empty, isAccountRegistered() is
# false, and the app sends the user back through registration/verification rather than crashing.
#
#   ./corrupt-reverify.sh            apply
#   ./corrupt-reverify.sh --restore  put the pristine account directory back
#
# Shares the pristine copy with corrupt-recoverable.sh. Quit the app first.
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

# Only save a pristine copy if the account is still intact — otherwise corrupt-recoverable.sh
# already took one and this directory is mid-experiment.
if [ ! -d "$PRISTINE" ]; then
  if ! grep -q . <<<"$(python3 -c "
import plistlib, sys
with open(sys.argv[1], 'rb') as f:
    plist = plistlib.load(f)
print('ok' if any(isinstance(o, dict) and 'client_id' in o for o in plist['\$objects']) else '')
" "$META")"; then
    echo "error: no pristine copy at $PRISTINE, and account_metadata already has no client_id."
    echo "       Refusing to snapshot an already-corrupted account as the restore point."
    exit 1
  fi
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

echo "Removing clientID from client_registration ..."
if [ -f "$ACCT_DIR/client_registration" ]; then
  python3 - "$ACCT_DIR/client_registration" <<'PY'
import plistlib, sys
path = sys.argv[1]
with open(path, 'rb') as f:
    plist = plistlib.load(f)
removed = 0
for obj in plist['$objects']:
    if isinstance(obj, dict) and 'clientID' in obj:
        del obj['clientID']
        removed += 1
if removed == 0:
    print("  clientID was already absent")
else:
    with open(path, 'wb') as f:
        plistlib.dump(plist, f, fmt=plistlib.FMT_BINARY)
    print(f"  removed clientID from {removed} object(s)")
PY
else
  echo "  client_registration not present (already no recovery source)"
fi
echo

echo "Pushing account directory ..."
push_dir "$ACCT_DIR" "$REMOTE_ACCT_DIR"
echo

echo "Verifying by re-reading the device ..."
pull_container
VERIFY_META=$(locate_account_dir)
report_state "$VERIFY_META"
echo
echo "Expected: client_id ABSENT, client_registration present but clientID ABSENT."
echo
echo "Force-quit and relaunch the app. On current main it should start without crashing, find"
echo "nothing to recover, and route the user back through registration/verification."
echo
echo "Undo with: $0 --restore"
