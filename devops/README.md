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

### Deployment

Deploy the Loki Logstack using the following command:

```bash
helm template bcwallet ./devops/charts/loki-logstack \
--set-string namespace=abc123-dev \
--set-string proxyUserName=<USER_NAME> \
--set-string proxyPassword=<PASSWORD> | \
oc apply -n e79518-dev -f -
```

The parameters passed in via the `--set-string` argument for this command are as follows:

| Value         | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| namespace     | The namespace in which to deploy the Loki Logstack. This is used by Caddy to find the Loki service. |
| proxyUserName | The username for the Loki Proxy. This is part of the authentication credentials.                    |
| proxyPassword | The password for the Loki Proxy.This is part of the authentication credentials.                     |

Once deployed there will be two pods running that can be verified with the following command:

```console
➜  vc-wallet-mobile ✗ oc get pods -l "app.kubernetes.io/name=logstack"

NAME                                       READY   STATUS    RESTARTS   AGE
bcwallet-logstack-loki-78867f88c8-zpm74    1/1     Running   0          39m
bcwallet-logstack-proxy-54977bb56b-jrnd9   1/1     Running   0          70m
```

In addition to the pods, there will be a route created for the Loki Proxy. This route is used by the BC Wallet to send its logs to the Loki Proxy. The route can be verified with the following command:

```console
➜  vc-wallet-mobile oc get routes -l "app.kubernetes.io/name=logstack"

NAME                      HOST/PORT                                                         PATH   SERVICES                  PORT   TERMINATION     WILDCARD
bcwallet-logstack-proxy   bcwallet-logstack-proxy-abc123-dev.apps.silver.devops.gov.bc.ca          bcwallet-logstack-proxy   2015   edge/Redirect   None
```

### Usage

To use the Loki Logstack, the BC Wallet needs to be configured to send its logs to the Loki Proxy. This is done by setting the following environment variables (in the .env):

| Variable Name      | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| REMOTE_LOGGING_URL | The route from above with basic authentication credentials |

For example:

```console
REMOTE_LOGGING_URL=https://<USERNAME>:<PASSWORD>@bcwallet-logstack-proxy-ab123-dev.apps.silver.devops.gov.bc.ca/loki/api/v1/push
```

You can use the following cURL command to the entire log stack. Loki does not accept outdated logs, so you will need to change the timestamp `1705256799868099100` to the current time.

Get and updated timestamp:

```console
➜  vc-wallet-mobile git:(fix/build-and-probe) ✗ node -e "console.log(Date.now() + '099100')"
1705256928213099100
```

Send a sample log with the updated timestamp:

```bash
curl -v -H "Content-Type: application/json" -X POST "https://<USERNAME>:<PASSWORD>@bcwallet-logstack-proxy-abc123-dev.apps.silver.devops.gov.bc.ca/loki/api/v1/push" --data-raw '{"streams": [{ "stream": { "bcwallet": "00123", "level": "debug" }, "values": [ [ "1705256928213099100", "fizbuzz" ] ] }]}'
```
