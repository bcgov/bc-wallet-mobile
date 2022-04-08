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

Fork and clone the Angular repository:

1. Login to your GitHub account or create one by following the instructions given
   [here](https://github.com/signup/free).
2. [Fork](https://help.github.com/forking) the [main BC Wallet
   repository](https://github.com/bcgov/bc-wallet-mobile).
3. Clone your fork of the BC Wallet repository and define an `upstream` remote pointing back to
   the BC Wallet repository that you forked in the first place.

```shell
# Clone your GitHub repository:
git clone git@github.com:<github username>/bc-wallet-mobile.git

# Go to the BC Wallet directory:
cd bc-wallet-mobile

# Add the main BC Wallet repository as an upstream remote to your repository:
git remote add upstream https://github.com/bcgov/bc-wallet-mobile.git
```

NOTE: from here on, all paths are relative to the cloned repository directory (e.g.: bc-wallet-mobile)

## Installing NPM Modules

Next, install the JavaScript modules needed to build and test BC Wallet:

```shell
# Install BC Wallet project dependencies (package.json)
# from the root of the cloned repository
npm install

```

## Running in an Android emulator
During the devlopment process, you may want to run the app in the emulator to see see what it looks like or for some manual testing.
```shell
cd bcwallet-app
npm run android
```
