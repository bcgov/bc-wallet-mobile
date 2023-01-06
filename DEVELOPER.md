# Building and testing BC Wallet

* [Prerequisite software](#prerequisite-software)
* [Cloning and initializing submodule](#cloning-and-initializing-submodule)
* [React Native setup](#react-native-setup)
* [Installing npm modules](#installing-npm-modules)
* [Configuration](#configuration)
* [Running in an Android emulator](#running-in-an-android-emulator)
* [Troubleshooting](#troubleshooting)

## Prerequisite software

Before you can proceed with building and testing the BC Wallet app, you must install and configure the
following products on your development machine:

* [Git](https://git-scm.com/) and/or the [**GitHub app**](https://desktop.github.com/) (for Mac and Windows);
  [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

* [Node.js](https://nodejs.org), (version specified in the engines field of [`package.json`](./app/package.json)) which is used to run a development web server, run tests, and generate distributable files.

* [npm](https://docs.npmjs.com/cli/) (version specified in the engines field of [`package.json`](./app/package.json)) which is used to install dependencies.

## Cloning and initializing submodule

First clone this repository:

```sh
# Clone your GitHub repository:
git clone https://github.com/bcgov/bc-wallet-mobile.git

# Go to the BC Wallet directory:
cd bc-wallet-mobile
```

Then initialize the bifold submodule:

```sh
# Initialize the aries bifold submodule:
git submodule update --init
```

## React Native setup
React Native environment setup instructions are documented [here](https://reactnative.dev/docs/environment-setup). Be sure to select version 0.66 from the dropdown. This will guide you through setting up your development environment for your operating system and choice of iOS (only if you are using a Mac) or Android. 

Following along, you should end up using Android SDK Platform 30 with Android 11 (API Level 30) for Android development and/or iOS 11 for iOS development.

## Installing npm modules

Next, install the npm modules needed to build and test BC Wallet from the root of the repository:

```sh
# Install BC Wallet project dependencies (package.json) from the root of the cloned repository
npm install --force
```

Note: the `--force` flag is needed here due to some peer dependencies' versions of bifold being exceeded in bc-wallet-mobile

## Configuration
In the `./app/` directory add an `.env` file containing:

```
IAS_PORTAL_URL=https://idsit.gov.bc.ca/issuer/v1/dids
IAS_AGENT_INVITE_URL=https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNmNjMjJiNTYtZmQwYy00Yjc4LWE3ZTQtYzYwYzJlODBlMDM0IiwgInJlY2lwaWVudEtleXMiOiBbIkNoSmJDTTVZSlMxb3hTQU1WNU1vY1J5cE1tUVp0eFFqcG9KWEZpTHZnMUM5Il0sICJsYWJlbCI6ICJJRElNIChTSVQpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9
MEDIATOR_URL=https://aries-mediator-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNmRhYjhmOTQtODU4NC00ZjI4LTg2ZTQtNzUwNmQ3MTBlNzViIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2FyaWVzLW1lZGlhdG9yLWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgInJlY2lwaWVudEtleXMiOiBbImlwZjRubmI1eXFtRUt1NnJWQXk2bTdFRDJWc3M5clV6RWFvaWlKVmNlRmkiXSwgImxhYmVsIjogIk1lZGlhdG9yIn0=
```

## Running in an Android emulator
During the development process, you may want to run the app in the emulator to see see what it looks like or for some manual testing.

First, start the emulator using Android Studio, then:

```sh
cd app
npm run android
```

Alternatively, you can open `./app/android/` in Android Studio and run the app and emulator from there.

After the initial debug app has been built and deployed to the emulator, you can start the metro bundler:
```sh
cd app
npm run start
```

### Adding QR code to emulator camera view
To place a QR code into the emulators camera view, first ensure you have set the emulators back camera to `VirtualScene`.

Then navigate to `<Android SDK Location>/emulator/resources` and open the `Toren1BD.posters` file in your editor.

Add a line break to the end of that file followed by:
```
poster custom
size 0.8 0.8
position 0 -0.1 -1.8
rotation 0.1 0 0
default custom.png
```

Note: You may have to reboot your emulator once this is complete for it to take effect.

Now, to add any image to the virtual scene (an image of a QR code for example), simply place the image file in this directory with the name `custom.png`

## Troubleshooting

### Hot reloading

Hot reloading may not work correctly with instantiated Agent objects. Reloading (`r`) or reopening the app may work. Any changes made to native modules require you to re-run the compile step.

### Dependency issues, native module linking issues

If you end up changing dependencies or structures, you may need to perform the following steps:

#### For Android
```sh
rm -rf app/node_modules
npm install --force
```

Clean the Android build:

```sh
cd app/android
./gradlew clean
cd ../..
```

Start and clean the Metro cache:

```sh
cd app
npm run start
```

In your second terminal, you can now run:

```sh
cd app
npm run android
```

### Android emulator issues

If the app seems to be hung while loading in your emulator, you made need to reset the connection by running the following in the Android Studio terminal:

```sh
adb reverse tcp:8081 tcp:8081
```

Ensure you have your emulator's front and back camera set to use different sources, as not doing so may cause the emulator to crash whenever the camera is opened.