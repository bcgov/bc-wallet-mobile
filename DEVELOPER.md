# Building and Testing BC Wallet

* [Prerequisite Software](#prerequisite-software)
* [Getting the Sources](#getting-the-sources)
* [Installing NPM Modules](#installing-npm-modules)
* [Running in an Android emulator](#running-in-an-android-emulator)

## Prerequisite Software

Before you can build and test Angular, you must install and configure the
following products on your development machine:

* [Git](https://git-scm.com/) and/or the [**GitHub app**](https://desktop.github.com/) (for Mac and Windows);
  [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

* [Node.js](https://nodejs.org), (version specified in the engines field of [`package.json`](./bcwallet-app/package.json)) which is used to run a development web server,
  run tests, and generate distributable files.

* [npm](https://docs.npmjs.com/cli/) (version specified in the engines field of [`package.json`](../bcwallet-app/package.json)) which is used to install dependencies.

* Android SDK

* Java

## Getting the Sources

### BC Wallet

NOTE: For now, you can clone from directly from https://github.com/bcgov/bc-wallet-mobile.git and checkout `bifold-framework` branch


```shell
# Clone your GitHub repository:
git clone https://github.com/bcgov/bc-wallet-mobile.git

# Go to the BC Wallet directory:
cd bc-wallet-mobile

# checkout branch
git checkout bifold-framework
```

NOTE: from here on, all paths are relative to the cloned repository directory (e.g.: bc-wallet-mobile)

### Aries Bifold

For now, you can clone from this [fork](https://github.com/cvarjao/aries-mobile-agent-react-native.git) and checkout `as-framework-step-2`
```shell
# Clone your GitHub repository:
git clone https://github.com/cvarjao/aries-mobile-agent-react-native.git aries-bifold

# Go to the BC Wallet directory:
cd aries-bifold

# checkout branch
git checkout as-framework-step-2
```


## Installing NPM Modules

Next, install the JavaScript modules needed to build and test BC Wallet:

```shell
# Install BC Wallet project dependencies (package.json)
# from the root of the cloned repository
npm install

```

IMPORTANT: If you are running `npm install` manually, you must provide `--legacy-peer-deps`

## Running in an Android emulator
During the devlopment process, you may want to run the app in the emulator to see see what it looks like or for some manual testing.
```shell
cd bcwallet-app
npm run android

```

## Updating package.json
```
npx --package=../bifold-core bifold sync-package-json
```
