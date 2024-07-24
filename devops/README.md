# TL;DR

This directory contains the source code for supporting infrastructure components for the project.

# Overview

## Loki Logstack

The Loki Logstack is a set of components for gathering and storing logs temporarily, which helps with troubleshooting and analyzing issues for the BC Wallet's advanced support team.

When turned on, the BC Wallet sends its logs to the Loki Logstack through the Loki Proxy. This proxy then forwards the logs to Loki for safekeeping. To ensure security, the Loki Proxy needs proper login details. It will only accept logs from the BC Wallet if the correct credentials are provided.

The components to the Loki Logstack deployment are as follows:

1. Loki - a log aggregation system

Read more about Loki [here](https://grafana.com/oss/loki/).

2. Proxy - a gatekeeper for the Loki system

The current proxy implementation is Caddy. Read more about Caddy [here](https://caddyserver.com/).

3. Minio - a high-performance object storage server
4. Memcached - a high-performance, distributed memory object caching system

### Deployment

Deploy the Loki Logstack using the following command:

```bash
helm template bcwallet ./devops/charts/loki-logstack -f ./devops/charts/loki-logstack/values_test.yaml \
--set-string namespace=ca7123-test \
--set-string minio_access_key=$MINIO_ACCESS_KEY \
--set-string minio_secret_key=$MINIO_SECRET_KEY \
--set-string proxyUserName=$PROXY_USER_NAME \
--set-string proxyPassword=$(htpasswd -nbB $PROXY_USER_NAME $PROXY_PASSWORD| awk -F: '{ print $2 }'|tr -d '[:space:]'|base64)| \
oc apply -n ca7123-test -f -
```

The parameters passed in via the `--set-string` argument for this command are as follows:

| Value            | Description                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| namespace        | The namespace in which to deploy the Loki Logstack. This is used by Caddy to find the Loki service. |
| proxyUserName    | The username for the Loki Proxy. This is part of the authentication credentials.                    |
| proxyPassword    | The password for the Loki Proxy.This is part of the authentication credentials.                     |
| minio_access_key | The access key associated with Minio                                                                |
| minio_secret_key | The secret key associated with Minio                                                                |

Once deployed there will be several pods running, depending on your replication count, that can be verified with the following command:

```console
➜  vc-wallet-mobile git:(feat/loki-ha) ✗ oc get pods -l "app.kubernetes.io/name=logstack"

NAME                                       READY   STATUS    RESTARTS   AGE
bcwallet-logstack-loki-79b7dfd4b4-2ffsb    1/1     Running   0          16h
bcwallet-logstack-loki-79b7dfd4b4-mds8h    1/1     Running   0          16h
bcwallet-logstack-memcached-0              1/1     Running   0          18h
bcwallet-logstack-memcached-1              1/1     Running   0          18h
bcwallet-logstack-minio-0                  1/1     Running   0          18h
bcwallet-logstack-minio-1                  1/1     Running   0          18h
bcwallet-logstack-proxy-5946c98d97-925qp   1/1     Running   0          18h
bcwallet-logstack-proxy-5946c98d97-clzlg   1/1     Running   0          18h
```

In addition to the pods, there will be a route created for the Loki Proxy. This route is used by the BC Wallet to send its logs to the Loki Proxy. The route can be verified with the following command:

```console
➜  vc-wallet-mobile oc get routes -l "app.kubernetes.io/name=logstack"

NAME                      HOST/PORT                                                         PATH   SERVICES                  PORT   TERMINATION     WILDCARD
bcwallet-logstack-proxy   bcwallet-logstack-proxy-abc123-test.apps.silver.devops.gov.bc.ca          bcwallet-logstack-proxy   2015   edge/Redirect   None
```

### Usage

To use the Loki Logstack, the BC Wallet needs to be configured to send its logs to the Loki Proxy. This is done by setting the following environment variables (in the .env):

| Variable Name      | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| REMOTE_LOGGING_URL | The route from above with basic authentication credentials |

For example:

```console
REMOTE_LOGGING_URL=https://<USERNAME>:<PASSWORD>@bcwallet-logstack-proxy-ab123-test.apps.silver.devops.gov.bc.ca/loki/api/v1/push
```

You can use the following cURL command to the entire log stack. Loki does not accept outdated logs, so you will need to change the timestamp `1705256799868099100` to the current time.

Get and updated timestamp:

```console
➜  vc-wallet-mobile ✗ node -e "console.log(Date.now() + '099100')"
1705256928213099100
```

Send a sample log with the updated timestamp:

```bash
curl -v -H "Content-Type: application/json" -H "Authorization: Basic Base64-Encoded-USERNAME:PASSWORD" -X POST "https://bcwallet-logstack-proxy-ca7123-test.apps.silver.devops.gov.bc.ca/loki/api/v1/push" --data-raw '{"streams":[{"stream":{"job":"react-native-logs","level":"debug","application":"bc wallet","version":"1.0.1-444","system":"iOS v16.7.4","session_id":"463217"},"values":[["1713486470448000000","{\"message\":\"Successfully connected to WebSocket wss://aries-mediator-agent.vonx.io\"}"]]}]}'
```
