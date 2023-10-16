# Developers Guide

- [Prerequisite software](#prerequisite-software)
- [Prerequisite services](#prerequisite-services)
- [Cloning and initializing submodule](#cloning-and-initializing-submodule)
- [React Native setup](#react-native-setup)
- [Installing npm modules](#installing-npm-modules)
- [Configuration](#configuration)
- [Running in an Android emulator](#running-in-an-android-emulator)
- [Troubleshooting and debugging](#troubleshooting-and-debugging)

## Prerequisite software

Before you can proceed with building and testing the BC Wallet app, you must install and configure the following products on your development machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org) & [npm](https://docs.npmjs.com/cli/) - (version specified in the `engines` field
  of [./app/package.json](./app/package.json))
  > **Tip**: use [nvm](https://github.com/nvm-sh/nvm) to install node & npm. It helps to easily switch node & npm
  > version for each project.

## Prerequisite services

Requires the following services to be up and running.

- [Von Network](https://github.com/bcgov/von-network)
- [Mediator Service](https://github.com/hyperledger/aries-mediator-service)

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

React Native environment setup instructions are documented [here](https://reactnative.dev/docs/environment-setup). Be sure to select the correct React Native version (currently 0.66.x) from the dropdown. This will guide you through setting up your development environment for your operating system and choice of iOS (only if you are using a Mac) or Android.

Following along, you should end up using Android SDK Platform 30 with Android 11 (API Level 30) for Android development and/or iOS 11 for iOS development.

## Installing npm modules

Next, install the npm modules needed to build and test BC Wallet from the root of the repository:

```sh
# Install BC Wallet project dependencies (package.json) from the root of the cloned repository
yarn install
```

## Configuration

In the `./app/` directory copy the .env.sample `cp .env.sample .env`

```
MEDIATOR_URL=<url>
```

### Adding ledger configurations

1.  clone bcovrin directory and navigate to your-sovrin-local

    ```shell
    cd ./bifold/core/configs/ledgers/indy
    cp -R bcovrin-test your-sovrin-local
    cd your-sovrin-local
    ```

2.  Open the file in `bifold/core/configs/ledgers/indy/your-sovrin-local/genesis-file.ts` and replace with the genesis transaction JSON from your ledger (typically when you have the ledger running locally it should be available at `http://localhost:9000/genesis`)

    ```ts
    // Place the json with
    export default `<<YOUR GENESIS TRANSACTION JSON>>`;
    ```

    (**For Example:**) it should look something like this.

    ```ts
    export default `{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"host.docker.internal","client_port":9702,"node_ip":"host.docker.internal","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}
    {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node2","blskey":"37rAPpXVoxzKhz7d9gkUe52XuXryuLXoM6P6LbWDB7LSbG62Lsb33sfG7zqS8TK1MXwuCHj1FKNzVpsnafmqLG1vXN88rt38mNFs9TENzm4QHdBzsvCuoBnPH7rpYYDo9DZNJePaDvRvqJKByCabubJz3XXKbEeshzpz4Ma5QYpJqjk","blskey_pop":"Qr658mWZ2YC8JXGXwMDQTzuZCWF7NK9EwxphGmcBvCh6ybUuLxbG65nsX4JvD4SPNtkJ2w9ug1yLTj6fgmuDg41TgECXjLCij3RMsV8CwewBVgVN67wsA45DFWvqvLtu4rjNnE9JbdFTc1Z4WCPA3Xan44K1HoHAq9EVeaRYs8zoF5","client_ip":"host.docker.internal","client_port":9704,"node_ip":"host.docker.internal","node_port":9703,"services":["VALIDATOR"]},"dest":"8ECVSk179mjsjKRLWiQtssMLgp6EPhWXtaYyStWPSGAb"},"metadata":{"from":"EbP4aYNeTHL6q385GuVpRV"},"type":"0"},"txnMetadata":{"seqNo":2,"txnId":"1ac8aece2a18ced660fef8694b61aac3af08ba875ce3026a160acbc3a3af35fc"},"ver":"1"}
    {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node3","blskey":"3WFpdbg7C5cnLYZwFZevJqhubkFALBfCBBok15GdrKMUhUjGsk3jV6QKj6MZgEubF7oqCafxNdkm7eswgA4sdKTRc82tLGzZBd6vNqU8dupzup6uYUf32KTHTPQbuUM8Yk4QFXjEf2Usu2TJcNkdgpyeUSX42u5LqdDDpNSWUK5deC5","blskey_pop":"QwDeb2CkNSx6r8QC8vGQK3GRv7Yndn84TGNijX8YXHPiagXajyfTjoR87rXUu4G4QLk2cF8NNyqWiYMus1623dELWwx57rLCFqGh7N4ZRbGDRP4fnVcaKg1BcUxQ866Ven4gw8y4N56S5HzxXNBZtLYmhGHvDtk6PFkFwCvxYrNYjh","client_ip":"host.docker.internal","client_port":9706,"node_ip":"host.docker.internal","node_port":9705,"services":["VALIDATOR"]},"dest":"DKVxG2fXXTU8yT5N7hGEbXB3dfdAnYv1JczDUHpmDxya"},"metadata":{"from":"4cU41vWW82ArfxJxHkzXPG"},"type":"0"},"txnMetadata":{"seqNo":3,"txnId":"7e9f355dffa78ed24668f0e0e369fd8c224076571c51e2ea8be5f26479edebe4"},"ver":"1"}
    {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node4","blskey":"2zN3bHM1m4rLz54MJHYSwvqzPchYp8jkHswveCLAEJVcX6Mm1wHQD1SkPYMzUDTZvWvhuE6VNAkK3KxVeEmsanSmvjVkReDeBEMxeDaayjcZjFGPydyey1qxBHmTvAnBKoPydvuTAqx5f7YNNRAdeLmUi99gERUU7TD8KfAa6MpQ9bw","blskey_pop":"RPLagxaR5xdimFzwmzYnz4ZhWtYQEj8iR5ZU53T2gitPCyCHQneUn2Huc4oeLd2B2HzkGnjAff4hWTJT6C7qHYB1Mv2wU5iHHGFWkhnTX9WsEAbunJCV2qcaXScKj4tTfvdDKfLiVuU2av6hbsMztirRze7LvYBkRHV3tGwyCptsrP","client_ip":"host.docker.internal","client_port":9708,"node_ip":"host.docker.internal","node_port":9707,"services":["VALIDATOR"]},"dest":"4PS3EDQ3dW1tci1Bp6543CfuuebjFrg36kLAUcskGfaA"},"metadata":{"from":"TWwCRQRZ2ZHMJFn9TzLp7W"},"type":"0"},"txnMetadata":{"seqNo":4,"txnId":"aa5e817d7cc626170eca175822029339a444eb0ee8f0bd20d3b0b76e566fb008"},"ver":"1"}`;
    ```

3.  Open `bifold/core/configs/ledgers/indy/your-sovrin-local/pool-config.ts` file and update the IndyPoolConfig id to `YourSovrinLocal`

    ```ts
    const config: IndyPoolConfig = {
      id: "YourSovrinLocal", // <----<<< as shown here
      genesisTransactions: genesisFile,
      isProduction: false,
    };
    ```

4.  Open `bifold/core/configs/ledgers/indy/index.ts` file and include `YourSovrinLocal` configuration that we just created.

    ```ts
    // ... other imports ...
    import YourSovrinLocal from "./your-sovrin-local/pool-config"; // <-----<<< add the import statement for YourSovrinLocal json file.

    export default [
      /* SovrinMainNet,
      IndicioMainNet,
      SovrinStagingNet,
      IndicioDemoNet,
      IndicioTestNet,
      CandyDev,
      BCovrinTest,*/
      YourSovrinLocal, // <-----<<< add the YourSovrinLocal json config as shown below.
      /*SovrinBuilderNet,*/
    ];
    ```

## Running in an Android emulator

During the development process, you may want to run the app in the emulator to see see what it looks like or for some manual testing.

### Creating Android emulator

1. Open <kbd>Android Studio</kbd> -> <kbd> ⠇settings</kbd> -> <kbd> 📲 Virtual Device Manager</kbd> -> <kbd> Create
   Device </kbd>

| Name         | Details                               | Comments                                                                                                          |
| ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Device       | Pixel 4 or Higher (Without PlayStore) | **Note** - To root the emulator you need the one without Play Store. If you want to update the `/etc/hosts` file. |
| System Image | Android 11, API Level - `30`          | **Note** - This should be preselected if you followed along with the React Native setup guide.                    |

2. (Optional) Follow the below instructions to start a rooted Android emulator (Required to be rooted to access the ledger running locally in order to
   update the device's `/etc/hosts` file.). Accessing ledgers available on the internet does not require rooting the device.

   > For more info - [Refer Official Docs - Local Network limitation](https://developer.android.com/studio/run/emulator-networking#networkinglimitations)

   1. List emulator

      ```shell
      emulator -list-avds
      Pixel_4_XL_API_30

      # Note - Your output might be different depending on the AVD you created above.
      ```

   2. Start emulator as writable system
      ```shell
      emulator -avd Pixel_4_XL_API_30 -writable-system -no-snapshot-load
      ```
   3. Open a new terminal session, and run commands described in steps 3, 4 & 5.
      <br> Restart as root user
      ```shell
      adb root
      ```
   4. Remount
      ```shell
      adb -s emulator-5554 remount
      ```
      output:
      ```
      remount succeeded
      ```
   5. Create a file with following host entries. We will copy this file into the emulator.
      1. create a file
      ```shell
      vi myhosts
      ```
      ```shell
      # Enter your local machines IP address. 192.168.0.107 is an example.
      192.168.0.107 host.docker.internal
      # Ensure to add a new line
      ```
      2. Push the file into the emulator
      ```shell
      adb -s emulator-5554 push myhosts /system/etc/hosts
      ```
   6. Verify if the host entries are updated correctly!

      ```shell
       # To Verify
       $ adb shell
       $ cat /etc/hosts

       127.0.0.1       localhost
       ::1             ip6-localhost
       192.168.0.117   host.docker.internal
      ```

   7. Goto Emulator -> ⚙️ <kbd> Settings</kbd> -> 🔒 Security
      1. Set a pin for screen lock
      2. Add a Fingerprint (To enable biometric authentication)
         <br>
   8. Done!

### Running app in Android emulator with Metro

Once you've created and configured your emulator:

```sh
cd app
yarn android
```

Alternatively, you can open `./app/android/` in Android Studio and run the app and emulator from there.

After the initial debug app has been built and deployed to the emulator, you can start the metro bundler:

```sh
cd app
yarn start
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

## Troubleshooting and debugging

### Hot reloading

Hot reloading may not work correctly with instantiated Agent objects. Reloading (`r`) or reopening the app may work. Any changes made to native modules require you to re-run the compile step.

### Dependency issues, native module linking issues

If you end up changing dependencies or structures, you may need to perform the following steps:

#### For Android

```sh
rm -rf app/node_modules
yarn install
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
yarn start
```

In your second terminal, you can now run:

```sh
cd app
yarn android
```

### Android emulator issues

If the app seems to be hung while loading in your emulator, you made need to reset the connection by running the following in the Android Studio terminal:

```sh
adb reverse tcp:8081 tcp:8081
```

Ensure you have your emulator's front and back camera set to use different sources, as not doing so may cause the emulator to crash whenever the camera is opened.

### Debugging in Intellij and Android Emulator

**UI Inspection:**

1. Install `react-devtools`, if you haven't already
   ```shell
   yarn install -g react-devtools
   ```
2. Run devtools (you can use this only for UI inspections)
   ```
   react-devtools
   ```
3. In a separate terminal, run the following command. To redirect network to react-devtools
   ```shell
   adb reverse tcp:8097 tcp:8097
   ```
   **Debug Application Code in Intellij or WebStorm**
4. Open directory `/app` as project
5. Run/Debug Configuration.

   > [Optional] update the port to `10001`. As the default port `8081` tends to run into
   > conflicts. If you don't have other services running on port 8081. You can skip changing the port

   ![](./docs/intellij-run-debug-config.png)

6. Start Wallet in Debug Mode. <br>
   ![img.png](./docs/intellij-debug-btn.png)

7. Now you can add breakpoint in your IDE.
   ![img.png](./docs/intellij-debugging.png)
   > Troubleshooting: <br>
   > If debug does not showup. Ensure you have enabled debugging on the device by clicking <kbd>command</kbd> + <kbd>m</kbd>
   > on the device and select <kbd>Debug</kbd>.
   > <br> > ![](./docs/Emulator-debug-menu.png)

### Debugging in VSCode and Android Emulator

[![](https://img.youtube.com/vi/UE66n7HOIAg/0.jpg)](https://www.youtube.com/watch?v=UE66n7HOIAg)
