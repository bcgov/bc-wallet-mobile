const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const fs = require('fs')
const path = require('path')
const escape = require('escape-string-regexp')
const exclusionList = require('metro-config/src/defaults/exclusionList')
require('dotenv').config()

const packageDirs = [
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/oca')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/remote-logs')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/core')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/verifier')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/react-native-attestation')),
  fs.realpathSync(path.join(__dirname, 'node_modules', 'react-native-bcsc-core')),
]

const watchFolders = [...packageDirs]

const extraExclusionlist = []
const extraNodeModules = {}

for (const packageDir of packageDirs) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pak = require(path.join(packageDir, 'package.json'))
  const modules = Object.keys({
    ...pak.peerDependencies,
    ...pak.devDependencies,
  })
  extraExclusionlist.push(...modules.map((m) => path.join(packageDir, 'node_modules', m)))

  modules.reduce((acc, name) => {
    acc[name] = path.join(__dirname, 'node_modules', name)
    return acc
  }, extraNodeModules)
}

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig()
  const metroConfig = {
    projectRoot: path.resolve(__dirname, './'),
    /*resetCache: true,*/
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: process.env.LOAD_STORYBOOK !== 'true',
        },
      }),
    },
    resolver: {
      blacklistRE: exclusionList(extraExclusionlist.map((m) => new RegExp(`^${escape(m)}\\/.*$`))),
      extraNodeModules: extraNodeModules,
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg', 'cjs'],
    },
    watchFolders,
  }

  return mergeConfig(getDefaultConfig(__dirname), metroConfig)
})()
