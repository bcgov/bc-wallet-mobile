#!/usr/bin/env bash
# Send one test log line to a Loki push endpoint, mirroring what the
# bifold remote-logs lokiTransport does, and report what came back.
#
#   REMOTE_LOGGING_URL='https://user:pass@host/loki/api/v1/push' scripts/loki-push-test.sh
#
# The URL's path is used verbatim, exactly as the app's Loki transport does.
# A URL without /loki/api/v1/push will "succeed" with a 200 and store nothing;
# this script reports that as a failure rather than hiding it.
#
# Optional env: JOB, LEVEL, MESSAGE, APP, EXTRA_LABELS (k=v,k=v), TIMEOUT, VERBOSE=1
# Exit: 0 on a 2xx push, 1 otherwise.

set -uo pipefail

URL="${REMOTE_LOGGING_URL:-${1:-}}"
if [ -z "$URL" ]; then
  echo "error: set REMOTE_LOGGING_URL (or pass the URL as \$1)" >&2
  exit 2
fi

JOB="${JOB:-react-native-logs}"
LEVEL="${LEVEL:-info}"
MESSAGE="${MESSAGE:-loki connectivity test}"
APP="${APP:-loki-push-test}"
TIMEOUT="${TIMEOUT:-25}"

# Percent-decode %XX only, so a password containing @ / : encoded as %40 / %3A
# works. Deliberately NOT decoding '+' as space: that is form-encoding, and
# base64-ish passwords legitimately contain '+'. Backslashes are escaped first
# so printf %b cannot eat them.
urldecode() {
  case "$1" in
    *%[0-9A-Fa-f][0-9A-Fa-f]*)
      printf '%b' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/%\(..\)/\\x\1/g')" ;;
    *) printf '%s' "$1" ;;
  esac
}

# Split scheme://[user:pass@]host[/path] without the naive split('@') the
# transport uses -- a password with an @ in it breaks that one.
scheme="${URL%%://*}"
rest="${URL#*://}"
if [ "$scheme" = "$URL" ]; then
  echo "error: URL must start with http:// or https://" >&2
  exit 2
fi

if printf '%s' "$rest" | grep -q '@'; then
  creds="${rest%@*}"          # greedy: last @ separates creds from host
  hostpath="${rest##*@}"
  user="$(urldecode "${creds%%:*}")"
  pass="$(urldecode "${creds#*:}")"
else
  creds=""; hostpath="$rest"; user=""; pass=""
fi

host="${hostpath%%/*}"
path="/${hostpath#*/}"
[ "$path" = "/$hostpath" ] && path=""            # no path component at all

# Use the path from the URL verbatim -- the same thing the app does. The Loki
# transport posts to the URL as given and never appends the push path, so a
# script that "helpfully" appends it tests something the app never does.
case "$path" in
  ""|"/")
    echo "WARNING: this URL has no path, so it will POST to the bare host." >&2
    echo "         These hosts answer / with an unauthenticated 200 OK and discard" >&2
    echo "         the payload, so the push looks fine and no log is stored." >&2
    echo "         A Loki write URL must end in /loki/api/v1/push." >&2
    ;;
esac

safe_url="$scheme://${user:+$user:<redacted>@}$host$path"
echo "POST $safe_url"

ts="$(( $(date +%s) * 1000000000 ))"

labels="\"job\":$(printf '%s' "$JOB" | sed 's/"/\\"/g; s/^/"/; s/$/"/'),\"level\":\"$LEVEL\",\"app\":\"$APP\""
if [ -n "${EXTRA_LABELS:-}" ]; then
  IFS=',' read -ra _pairs <<< "$EXTRA_LABELS"
  for kv in "${_pairs[@]}"; do
    k="${kv%%=*}"; v="${kv#*=}"
    [ -n "$k" ] && labels="$labels,\"$k\":\"$v\""
  done
fi

esc_msg="$(printf '%s' "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g')"
line="{\\\"message\\\":\\\"$esc_msg\\\",\\\"data\\\":null,\\\"error\\\":null}"
payload="{\"streams\":[{\"stream\":{$labels},\"values\":[[\"$ts\",\"$line\"]]}]}"

args=(-s -S --max-time "$TIMEOUT" -X POST -H 'Content-Type: application/json'
      -w '\n__HTTP__%{http_code}' --data-binary "$payload")
if [ -n "$user" ]; then
  auth="$(printf '%s:%s' "$user" "$pass" | base64 | tr -d '\n')"
  args+=(-H "Authorization: Basic $auth")
fi
[ "${VERBOSE:-0}" = "1" ] && { echo "payload: $payload"; args+=(-i); }

out="$(curl "${args[@]}" "$scheme://$host$path" 2>&1)"
code="${out##*__HTTP__}"
body="${out%__HTTP__*}"

echo "HTTP $code"
[ -n "${body//[[:space:]]/}" ] && echo "$body"

case "$code" in
  204) echo "OK - accepted (Loki returns 204 on a successful push)"; exit 0 ;;
  200) echo "FAIL - 200 is NOT a successful push. Only 204 is."
       echo "       A 200 from these hosts is the nginx health check swallowing the"
       echo "       payload, which happens when the URL is missing /loki/api/v1/push."
       exit 1 ;;
  2*)  echo "FAIL - unexpected 2xx; only 204 means the line was stored"; exit 1 ;;
  401|403) echo "FAIL - credentials rejected by the gateway"; exit 1 ;;
  404) echo "FAIL - wrong path; expected the URL to end in /loki/api/v1/push"; exit 1 ;;
  400) echo "FAIL - Loki rejected the payload (often a timestamp too old / out of order)"; exit 1 ;;
  000) echo "FAIL - no response (DNS, TLS, timeout, or VPN not connected)"; exit 1 ;;
  *)   echo "FAIL - unexpected status"; exit 1 ;;
esac
