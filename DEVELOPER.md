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

* Java 8

## Getting the Sources

Folder scructure:
```
/bc-wallet-mobile # clone from https://github.com/bcgov/bc-wallet-mobile.git
    /aries-bifold # clone from https://github.com/cvarjao/aries-mobile-agent-react-native.git
```

### BC Wallet

For now, you can clone  directly from https://github.com/bcgov/bc-wallet-mobile.git

```shell
# Clone your GitHub repository:
git clone https://github.com/bcgov/bc-wallet-mobile.git

# Go to the BC Wallet directory:
cd bc-wallet-mobile
```

NOTE: from here on, all paths are relative to the cloned repository directory (e.g.: bc-wallet-mobile)

### Aries Bifold

For now, all you have to do is initialize the sub-module
```shell
# Initialize the aries bifold submodule:
git submodule update --init
```

## Updating Environment Variables (Linux)

Make sure you have Android sdk installed, if you have android studio installed then you should already have it.
```shell
# Update the PATH and add the variable ANDROID_SDK_ROOT

# Replace <YOUR_USER_NAME> with your user name. 
# /home/<YOUR_USER_NAME>/Android/Sdk is the default location of the sdk when using android studio. 
# Depending on how you installed the SDK, it may be in a different folder. 
# Make sure that ANDROID_SDK_ROOT is set to the "Sdk" folder in your android SDK installation
export ANDROID_SDK_ROOT=/home/<YOUR_USER_NAME>/Android/Sdk
export PATH="${PATH}:${ANDROID_SDK_ROOT}/emulator:${ANDROID_SDK_ROOT}/tools:${ANDROID_SDK_ROOT}/tools/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin"
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
During the development process, you may want to run the app in the emulator to see see what it looks like or for some manual testing.

```shell
cd app
npm run android
```
After the initial debug app has been built and deployed to the emulator, you can just start the metro bundler:
```shell
cd app
npm run start
```

## Updating package.json
```
cd app
npx --package=../bifold/core bifold sync-package-json
```
