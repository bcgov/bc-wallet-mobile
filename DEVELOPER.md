# Developers Guide

<!-- TOC -->
* [Developers Guide](#developers-guide)
  * [Prerequisite Software](#prerequisite-software)
  * [Prerequisite Services](#prerequisite-services)
  * [Environment Setup](#environment-setup)
    * [React Native & Android Emulator](#react-native--android-emulator)
    * [Create Android emulator](#create-android-emulator)
  * [Development](#development)
    * [Workspace Setup](#workspace-setup)
    * [Running in an Android Emulator](#running-in-an-android-emulator)
    * [Debugging in Intellij and Android Emulator](#debugging-in-intellij-and-android-emulator)
    * [Debugging in VSCode and Android Emulator](#debugging-in-vscode-and-android-emulator)
  * [Source Code Information](#source-code-information)
<!-- TOC -->

## Prerequisite Software

Before you can build and test, you must install and configure the
following products on your development machine:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org) & [npm](https://docs.npmjs.com/cli/) - (version specified in the `engines` field
  of [./app/package.json](./app/package.json))
  > **Tip**: use [nvm](https://github.com/nvm-sh/nvm) to install node & npm. It helps to easily switch node & npm
  version for each project.
* Android SDK and Android Emulator
  > **Tip**: It is recommended to install the [Android Studio](https://developer.android.com/studio), it comes with
  android sdk,
  > device manager to install emulators.
* JDK 8 or 11 (Preferably OpenJDK or ZuluJDK)

## Prerequisite Services
Requires the following services to be up and running.

- [Von Network](https://github.com/bcgov/von-network)
- [Mediator Service](https://github.com/hyperledger/aries-mediator-service)

## Environment Setup

### React Native & Android Emulator

React Native requires the following environment variables to be set in order to start the Android Emulator.

**Linux:**

```shell
# Update the PATH and add the variable ANDROID_SDK_ROOT

# Replace <YOUR_USER_NAME> with your user name. 
# /home/<YOUR_USER_NAME>/Android/Sdk is the default location of the sdk when using android studio. 
# Depending on how you installed the SDK, it may be in a different folder. 
# Make sure that ANDROID_SDK_ROOT is set to the "Sdk" folder in your android SDK installation
export ANDROID_SDK_ROOT=/home/<YOUR_USER_NAME>/Android/Sdk
export PATH="${PATH}:${ANDROID_SDK_ROOT}/emulator:${ANDROID_SDK_ROOT}/tools:${ANDROID_SDK_ROOT}/tools/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin"
```

<small><kbd>Esc</kbd> + <kbd>:</kbd> + <kbd>wq</kbd> - to save and quit  </small>

**MacOS:**

```
vi ~/.zprofile
```

add the following to the end of the file.

```shell
# Android
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
```

<small><kbd>Esc</kbd> + <kbd>:</kbd> + <kbd>wq</kbd> - to save and quit</small>

### Create Android emulator

1. Open <kbd>Android Studio</kbd> -> <kbd> ⠇settings</kbd> -> <kbd> 📲 Virtual Device Manager</kbd> -> <kbd> Create
   Device </kbd>

| Name          | Details                              | Comments                                                                                                         |
|---------------|--------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Device        | Pixel 4 or Higher (Without PlayStore) | **Note** - To root the emulator you need the one without Play Store. If you want to update the `/etc/hosts` file. |
| System Image  | Latest Android operating system      | Preferrabily - Release Name - `S`, API Level - `31` or higher                                                    | 

2. (Optional) Start a Rooted Android emulator (Required to be rooted to access the ledger running locally in order to 
    update the device's `/etc/hosts` file.). For accessing ledgers available on the internet does not require rooting the device. 
     
    > For more info - [Refer Official Docs - Local Network limitation](https://developer.android.com/studio/run/emulator-networking#networkinglimitations)


   1. List emulator
       ```shell
       emulator -list-avds
       Pixel_4_XL_API_31    
       
       # Note - Your output might be different depending on the AVD you created above.
       ```
   2. Start emulator as writable system
       ```shell
       emulator -avd Pixel_4_XL_API_31 -writable-system -no-snapshot-load
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
   5. Verify if the host entries are updated correctly!
      ```shell
       # To Verify
       $ adb shell
       $ cat /etc/hosts 
      
       127.0.0.1       localhost
       ::1             ip6-localhost
       192.168.0.117   host.docker.internal
      ``` 
   6. Goto Emulator -> ⚙️ <kbd> Settings</kbd>  -> 🔒 Security
      1. Set a pin for screen lock
      2. Add a Fingerprint (To enable biometric authentication)
      <br>
      
   7. Done!

## Development

### Workspace Setup

1. Clone git repo
    ```shell
    # Clone your GitHub repository:
    git clone git@git.novascotia.ca:digitalplatformservices/ns-wallet/ns-wallet-mobile-app.git
    
    # Go to the NS Wallet directory:
    cd ns-wallet-mobile-app
    ```

2. Initialize the Aries `bifold` git sub-module
    ```shell
    # Initialize the aries bifold submodule:
    git submodule update --init
    ```
   (Optional) Updating `package.json`
    ```
    cd app
    npx --package=../bifold/core bifold sync-package-json
    ```

3. Add the Mediator URL in `.env` file

    ```shell
    vi .env
    ```
    and add the following configuration the file.
    ```shell
    MEDIATOR_URL=https://<YOUR_NGROK_UUID>.ngrok.io?c_i=<YOUR_NGROK_JWT_TOKEN>
    ```
   <small><kbd>Esc</kbd> + <kbd>:</kbd> + <kbd>wq</kbd> - to save and quit  </small>
   <br>
   <br>

4. Add Your Ledger configurations in `bifold/core/configs/ledgers/indy` (Genesis transaction JSON)

   1. clone bcovrin directory and navigate to your-sovrin-local

      ```shell
      cd ./bifold/core/configs/ledgers/indy
      cp -R bcovrin-test your-sovrin-local
      cd your-sovrin-local
      ```

   2. Open the file in `bifold/core/configs/ledgers/indy/your-sovrin-local/genesis-file.ts` and replace with the genesis trasnsaction json from your ledger (Typically when you have the ledger    running locally it should be availale at `http://localhost:9000/genesis`)

      ```shell
      vi bifold/core/configs/ledgers/indy/your-sovrin-local/genesis-file.ts
      ```
      ```typescript
      // Place the json with 
      export default `<<YOUR GENESIS TRANSACTION JSON>>`
      ```
      (**For Example:**) it should look something like this.
      ```typescript
      export default `{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"host.docker.internal","client_port":9702,"node_ip":"host.docker.internal","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}
      {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node2","blskey":"37rAPpXVoxzKhz7d9gkUe52XuXryuLXoM6P6LbWDB7LSbG62Lsb33sfG7zqS8TK1MXwuCHj1FKNzVpsnafmqLG1vXN88rt38mNFs9TENzm4QHdBzsvCuoBnPH7rpYYDo9DZNJePaDvRvqJKByCabubJz3XXKbEeshzpz4Ma5QYpJqjk","blskey_pop":"Qr658mWZ2YC8JXGXwMDQTzuZCWF7NK9EwxphGmcBvCh6ybUuLxbG65nsX4JvD4SPNtkJ2w9ug1yLTj6fgmuDg41TgECXjLCij3RMsV8CwewBVgVN67wsA45DFWvqvLtu4rjNnE9JbdFTc1Z4WCPA3Xan44K1HoHAq9EVeaRYs8zoF5","client_ip":"host.docker.internal","client_port":9704,"node_ip":"host.docker.internal","node_port":9703,"services":["VALIDATOR"]},"dest":"8ECVSk179mjsjKRLWiQtssMLgp6EPhWXtaYyStWPSGAb"},"metadata":{"from":"EbP4aYNeTHL6q385GuVpRV"},"type":"0"},"txnMetadata":{"seqNo":2,"txnId":"1ac8aece2a18ced660fef8694b61aac3af08ba875ce3026a160acbc3a3af35fc"},"ver":"1"}
      {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node3","blskey":"3WFpdbg7C5cnLYZwFZevJqhubkFALBfCBBok15GdrKMUhUjGsk3jV6QKj6MZgEubF7oqCafxNdkm7eswgA4sdKTRc82tLGzZBd6vNqU8dupzup6uYUf32KTHTPQbuUM8Yk4QFXjEf2Usu2TJcNkdgpyeUSX42u5LqdDDpNSWUK5deC5","blskey_pop":"QwDeb2CkNSx6r8QC8vGQK3GRv7Yndn84TGNijX8YXHPiagXajyfTjoR87rXUu4G4QLk2cF8NNyqWiYMus1623dELWwx57rLCFqGh7N4ZRbGDRP4fnVcaKg1BcUxQ866Ven4gw8y4N56S5HzxXNBZtLYmhGHvDtk6PFkFwCvxYrNYjh","client_ip":"host.docker.internal","client_port":9706,"node_ip":"host.docker.internal","node_port":9705,"services":["VALIDATOR"]},"dest":"DKVxG2fXXTU8yT5N7hGEbXB3dfdAnYv1JczDUHpmDxya"},"metadata":{"from":"4cU41vWW82ArfxJxHkzXPG"},"type":"0"},"txnMetadata":{"seqNo":3,"txnId":"7e9f355dffa78ed24668f0e0e369fd8c224076571c51e2ea8be5f26479edebe4"},"ver":"1"}
      {"reqSignature":{},"txn":{"data":{"data":{"alias":"Node4","blskey":"2zN3bHM1m4rLz54MJHYSwvqzPchYp8jkHswveCLAEJVcX6Mm1wHQD1SkPYMzUDTZvWvhuE6VNAkK3KxVeEmsanSmvjVkReDeBEMxeDaayjcZjFGPydyey1qxBHmTvAnBKoPydvuTAqx5f7YNNRAdeLmUi99gERUU7TD8KfAa6MpQ9bw","blskey_pop":"RPLagxaR5xdimFzwmzYnz4ZhWtYQEj8iR5ZU53T2gitPCyCHQneUn2Huc4oeLd2B2HzkGnjAff4hWTJT6C7qHYB1Mv2wU5iHHGFWkhnTX9WsEAbunJCV2qcaXScKj4tTfvdDKfLiVuU2av6hbsMztirRze7LvYBkRHV3tGwyCptsrP","client_ip":"host.docker.internal","client_port":9708,"node_ip":"host.docker.internal","node_port":9707,"services":["VALIDATOR"]},"dest":"4PS3EDQ3dW1tci1Bp6543CfuuebjFrg36kLAUcskGfaA"},"metadata":{"from":"TWwCRQRZ2ZHMJFn9TzLp7W"},"type":"0"},"txnMetadata":{"seqNo":4,"txnId":"aa5e817d7cc626170eca175822029339a444eb0ee8f0bd20d3b0b76e566fb008"},"ver":"1"}`
      ```

   3. Open `pool-config.ts` file and update the IndyPoolConfig id to `YourSovrinLocal`

      ```shell
      vi bifold/core/configs/ledgers/indy/your-sovrin-local/pool-config.ts
      ```
      ```ts
      const config: IndyPoolConfig = {
          id: 'YourSovrinLocal',                           // <----<<< as shown here
          genesisTransactions: genesisFile,
          isProduction: false,
      }
      ```

   4. Open `ledgers/indy/index.ts` file and include `YourSovrinLocal` configuration that we just created.

      ```shell
      vi bifold/core/configs/ledgers/indy/index.js
      ```
      ```ts
      // ... other imports ... 
      import YourSovrinLocal from './your-sovrin-local/pool-config'  // <-----<<< add the import statement for YourSovrinLocal json file.  


      export default [
      /* SovrinMainNet,
        IndicioMainNet,
        SovrinStagingNet,
        IndicioDemoNet,
        IndicioTestNet,
        CandyDev,
        BCovrinTest,*/
        YourSovrinLocal                          // <-----<<< add the YourSovrinLocal json config as shown below.   
        /*SovrinBuilderNet,*/
      ]
      ```  
      > Future Tip - Once we have a stable test environment we should consider committing all these configuration within `bifold` repo.

5. Switch to correct node version

   ```shell
   nvm use 16     # Note the node version should match with the version specified in app/package.json -> engines -> node version
   
   # Alternatively you can set Node update the default node version by running the following command
   nvm alias default 16    # or nvm alias default 16.14.2  - for a specific version.          
   ```   

6. npm build

    ```shell
    # Install NS Wallet project dependencies (package.json)
    # from the root of the cloned repository
    $ npm install npm-run-all --save-dev
    $ npm run install:all --legacy-peer-deps
    ```
   > **IMPORTANT:** If you are running `npm run install:all` manually, you must provide `--legacy-peer-deps`
   
### Running in an Android Emulator

5. Run the app in the emulator
   > Note - This step requires Android emulator to be up and running.

   Start metro
   ```shell
   cd app
   export RCT_METRO_PORT=10001   # (Optional) Default port is 8081 - often runs into conflicts
   npm run start
   ```
   and in a new terminal window, run the following command to deploy the app in emulator.

   ```shell
   cd app
   export RCT_METRO_PORT=10001   # (Optional) Default port is 8081 - often runs into conflicts
   npm run android
   ```
### Debugging in Intellij and Android Emulator

**UI Inspection:**
1. Install `react-devtools`, if you haven't already
   ```shell
   npm install -g react-devtools
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
1. Open directory `/app` as project
2. Run/Debug Configuration. 
   > [Optional] update the port to `10001`. As the default port `8081` tends to run into 
   conflicts. If you don't have other services running on port 8081. You can skip changing the port
   
   ![](<./docs/intellij-run-debug-config.png>)

3. Start Wallet in Debug Mode. <br>
   ![img.png](<./docs/intellij-debug-btn.png>)

4. Now you can add breakpoint in your IDE.
   ![img.png](<./docs/intellij-debugging.png>)
    > Troubleshooting: <br>
    > If debug does not showup. Ensure you have enabled debugging on the device by clicking <kbd>command</kbd> + <kbd>m</kbd>
    > on the device and select <kbd>Debug</kbd>.
    > <br>
    > ![](<./docs/Emulator-debug-menu.png>)
    > 

### Debugging in VSCode and Android Emulator

[![](https://img.youtube.com/vi/UE66n7HOIAg/0.jpg)](https://www.youtube.com/watch?v=UE66n7HOIAg)

## Source Code Information

**Folder structure:**

``` bash
.
├── COMPLIANCE.yaml
├── CONTRIBUTING.md
├── DEVELOPER.md
├── LICENSE
├── README.md
├── RELEASE.md
├── app
├── bifold            # aries-bifold git submodule (contains the core implementation)
├── docs
├── jest.config.js
├── options.plist
├── package-lock.json
├── package.json
├── patch
├── release.xcconfig
├── scripts
└── tsconfig-base.json
```
