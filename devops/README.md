# TL;DR

This directory contains the source code for supporting infrastructure components for the project.

# Overview

## Loki Logstack

The Loki Logstack gathers and stores logs temporarily for troubleshooting and analysis by the BC Wallet advanced support team.

When enabled, the BC Wallet sends logs to Loki through a Caddy reverse proxy. The proxy authenticates requests using HTTP Basic Auth and forwards them to Loki for storage.

### Components

| Component    | Role                           | Kind         | Details                                           |
| ------------ | ------------------------------ | ------------ | ------------------------------------------------- |
| **Loki**     | Log aggregation                | Deployment   | [grafana.com/oss/loki](https://grafana.com/oss/loki/) |
| **Proxy**    | Auth gateway (Caddy)           | Deployment   | [caddyserver.com](https://caddyserver.com/)       |
| **Minio**    | Object storage (S3-compatible) | StatefulSet  |                                                   |
| **Memcached**| Query/chunk caching            | StatefulSet  |                                                   |

### Environments

| Environment | Namespace      | Values File        | Replicas | Autoscaling |
| ----------- | -------------- | ------------------ | -------- | ----------- |
| Dev         | `ca7f8f-dev`   | `values_dev.yaml`  | 1        | No          |
| Test        | `ca7f8f-test`  | `values_test.yaml` | 2        | No          |
| Prod        | `ca7f8f-prod`  | `values_prod.yaml` | 3        | Yes (3-5)   |

Production uses HorizontalPodAutoscalers on the Loki and Proxy deployments (80% CPU target).

### Credential Generation

Each environment needs its own set of credentials. Generate them before deploying:

```bash
# Minio credentials
export MINIO_ACCESS_KEY=$(openssl rand -hex 16)
export MINIO_SECRET_KEY=$(openssl rand -hex 16)

# Proxy credentials (username: 8 hex chars, password: 16 hex chars)
export PROXY_USER_NAME=$(openssl rand -hex 8)
export PROXY_PASSWORD=$(openssl rand -hex 16)
```

### Deployment

Deploy the Loki Logstack by substituting the values file and namespace for the target environment:

```bash
helm install bcwallet ./devops/charts/loki-logstack \
  -f ./devops/charts/loki-logstack/<VALUES_FILE> \
  --set-string namespace=<NAMESPACE> \
  --set-string minio_access_key=$MINIO_ACCESS_KEY \
  --set-string minio_secret_key=$MINIO_SECRET_KEY \
  --set-string proxyUserName=$PROXY_USER_NAME \
  --set-string proxyPassword=$(htpasswd -nbB $PROXY_USER_NAME $PROXY_PASSWORD | awk -F: '{ print $2 }' | tr -d '[:space:]' | base64)
```

For example, to deploy to prod:

```bash
helm install bcwallet ./devops/charts/loki-logstack \
  -f ./devops/charts/loki-logstack/values_prod.yaml \
  --set-string namespace=ca7f8f-prod \
  --set-string minio_access_key=$MINIO_ACCESS_KEY \
  --set-string minio_secret_key=$MINIO_SECRET_KEY \
  --set-string proxyUserName=$PROXY_USER_NAME \
  --set-string proxyPassword=$(htpasswd -nbB $PROXY_USER_NAME $PROXY_PASSWORD | awk -F: '{ print $2 }' | tr -d '[:space:]' | base64)
```

#### Parameters

| Value              | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `namespace`        | Target namespace. Used by Caddy to resolve the Loki service via cluster DNS.        |
| `proxyUserName`    | Plaintext username for Caddy Basic Auth.                                            |
| `proxyPassword`    | Base64-encoded bcrypt hash of the password (the `htpasswd` pipeline handles this).  |
| `minio_access_key` | Minio access key (stored in a Secret).                                              |
| `minio_secret_key` | Minio secret key (stored in a Secret).                                              |

### Verifying the Deployment

Check pods are running:

```bash
oc get pods -l "app.kubernetes.io/name=logstack" -n <NAMESPACE>
```

Check the proxy route exists:

```bash
oc get routes -l "app.kubernetes.io/name=logstack" -n <NAMESPACE>
```

### Usage

Configure the BC Wallet to send logs by setting `REMOTE_LOGGING_URL` in `app/.env`:

```
REMOTE_LOGGING_URL=https://<USERNAME>:<PASSWORD>@<PROXY_ROUTE_HOST>/loki/api/v1/push
```

Where `<USERNAME>` and `<PASSWORD>` are the plaintext proxy credentials (not the bcrypt hash), and `<PROXY_ROUTE_HOST>` is the hostname from the route above.

#### Testing the Log Stack

Send a sample log to verify the full pipeline. Loki rejects outdated timestamps, so generate a current one first:

```bash
# Get a current nanosecond timestamp
TIMESTAMP=$(node -e "console.log(Date.now() + '000000')")

# Send a test log entry
curl -v -H "Content-Type: application/json" \
  -u $PROXY_USER_NAME:$PROXY_PASSWORD \
  -X POST "https://<PROXY_ROUTE_HOST>/loki/api/v1/push" \
  --data-raw "{\"streams\":[{\"stream\":{\"job\":\"react-native-logs\",\"level\":\"debug\",\"application\":\"bc wallet\",\"version\":\"1.0.0\",\"system\":\"iOS\",\"session_id\":\"test\"},\"values\":[[\"$TIMESTAMP\",\"{\\\"message\\\":\\\"Test log entry\\\"}\"  ]]}]}"
```
