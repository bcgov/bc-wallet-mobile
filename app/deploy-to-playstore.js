/* eslint-disable */
const fs = require('fs')
const { google } = require('googleapis')

const pjson = require('./package.json')

if (typeof process.env.GOOGLE_API_CREDENTIALS === 'undefined') {
  console.log(`
  Google Publish v${pjson.version}
  GOOGLE_API_CREDENTIALS cannot be empty
  Set the env var GOOGLE_API_CREDENTIALS to the full path of the
  JSON credentials (keys) downloaded from the GCP console.
  eg: /path/to/some/credentials.json
  `)
  process.exit(1)
}

if (typeof process.env.ANDROID_PACKAGE_NAME === 'undefined') {
  console.log(`
  Google Publish v${pjson.version}
  ANDROID_PACKAGE_NAME cannot be empty
  Set the env var ANDROID_PACKAGE_NAME to the full package name
  used in the Android project.
  eg: ca.fullboar.BifoldWallet
  `)
  process.exit(1)
}

if (typeof process.env.ANDROID_BUNDLE_PATH === 'undefined') {
  console.log(`
  Google Publish v${pjson.version}
  ANDROID_BUNDLE_PATH cannot be empty
  Set the env var ANDROID_BUNDLE_PATH to the full path to the
  bundle (aab) file produced by the build.
  eg: /path/to/some/bundle.aab
  `)
  process.exit(1)
}

if (typeof process.env.VERSION_NAME === 'undefined') {
  console.log(`
  Google Publish v${pjson.version}
  VERSION_NAME cannot be empty
  Set the env var VERSION_NAME to the full version name
  eg: 1.0.2
  `)
  process.exit(1)
}

const expiryTimeSeconds = 600 // 10 min
const scopes = ['https://www.googleapis.com/auth/androidpublisher']

const main = async () => {
  const keyFile = process.env.GOOGLE_API_CREDENTIALS
  const packageName = process.env.ANDROID_PACKAGE_NAME
  const bundlePath = process.env.ANDROID_BUNDLE_PATH
  const branchName = process.env.BRANCHE_NAME

  console.log(`Google Publish v${pjson.version}`)

  try {
    console.log('Creating Google API client.')
    const client = await google.auth.getClient({
      keyFile,
      scopes,
    })

    console.log('Preparing Android publisher.')
    const play = await google.androidpublisher({
      version: 'v3',
      auth: client,
      params: {
        packageName,
      },
    })

    console.log('Creating an Edit.')
    const edit = await play.edits.insert({
      resource: {
        id: `${new Date().getTime()}`,
        expiryTimeSeconds,
      },
    })

    console.log('Loading bundle data.')
    const bundle = fs.readFileSync(bundlePath)

    console.log('Uploading bundle data to Edit.')
    await play.edits.bundles.upload({
      editId: edit.data.id,
      packageName,
      media: {
        mimeType: 'application/octet-stream',
        body: bundle,
      },
    })

    let track = 'internal'
    if (branchName === 'main') {
      track = 'internal' // TODO: set to production
    } else if (branchName === 'acceptation') {
      track = 'Acceptation'
    } else if (branchName === 'integration') {
      track = 'Integration'
    }

    console.log('Updating internal track.')
    await play.edits.tracks.update({
      editId: edit.data.id,
      packageName,
      track: track,
      requestBody: {
        releases: [
          {
            name: `v${process.env.VERSION_NAME}-${process.env.GITHUB_RUN_NUMBER}`,
            status: 'completed', // draft, inProgress, completed
            // userFraction: 0.99,
            versionCodes: [`${process.env.GITHUB_RUN_NUMBER ? process.env.GITHUB_RUN_NUMBER : 0}`],
            releaseNotes: [
              {
                language: 'en-CA',
                text: `Release ${process.env.VERSION_NAME}-${process.env.GITHUB_RUN_NUMBER}`,
              },
            ],
          },
        ],
      },
    })

    console.log('Committing Edit.')
    await play.edits.commit({
      editId: edit.data.id,
    })

    process.exit(0)
  } catch (e) {
    console.log('error = ', e)
    process.exit(1)
  }
}

main()
