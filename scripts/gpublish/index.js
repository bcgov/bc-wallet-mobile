#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

if (typeof process.env.GOOGLE_API_CREDENTIALS === 'undefined') {
  console.log(`
  GOOGLE_API_CREDENTIALS cannot be empty

  Set the env var GOOGLE_API_CREDENTIALS to the full path of the
  JSON credentials (keys) downloaded from the GCP console.
  eg: /path/to/some/credentials.json
  `);
  process.exit(1);
}

if (typeof process.env.ANDROID_PACKAGE_NAME === 'undefined') {
  console.log(`
  ANDROID_PACKAGE_NAME cannot be empty

  Set the env var ANDROID_PACKAGE_NAME to the full package name
  used in the Android project.
  eg: ca.fullboar.BifoldWallet
  `); 
  process.exit(1);
}

if (typeof process.env.ANDROID_BUNDLE_PATH === 'undefined') {
  console.log(`
  ANDROID_BUNDLE_PATH cannot be empty

  Set the env var ANDROID_BUNDLE_PATH to the full path to the
  bundle (aab) file produced by the build.
  eg: /path/to/some/bundle.aab
  `);
  process.exit(1);
}

const expiryTimeSeconds= 600 // 10 min
const scopes = [
  'https://www.googleapis.com/auth/androidpublisher',
];

const main = async () => {

  const keyFile = process.env.GOOGLE_API_CREDENTIALS;
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const bundlePath = process.env.ANDROID_BUNDLE_PATH;
  
  try {
    const client = await google.auth.getClient({
      keyFile,
      scopes,
    });

    const play = await google.androidpublisher({
      version: 'v3',
      auth: client,
      params: {
        packageName,
      }
    });

    const edit = await play.edits.insert({
      resource: {
          id: `${new Date().getTime()}`,
          expiryTimeSeconds,
      }
    });

    const bundle = fs.readFileSync(bundlePath);
    
    await play.edits.bundles.upload({
      editId: edit.data.id,
      packageName,
      media: {
          mimeType: 'application/octet-stream',
          body: bundle
      }
    });

    process.exit(0);
  } catch (e) {
    console.log('error = ', e)
    process.exit(1);
  }
}

main();
