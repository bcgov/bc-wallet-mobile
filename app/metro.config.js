const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const fs = require('fs')
const path = require('path')
const escape = require('escape-string-regexp')
const { FileStore } = require('metro-cache')

require('dotenv').config()

const exclusionList = (additionalExclusions = []) => {
  const defaults = [/\/__tests__\/.*/]

  const escapeRegExp = (pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.source.replace(/\/|\\\//g, `\\${path.sep}`)
    }
    if (typeof pattern === 'string') {
      const escaped = pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      return escaped.replaceAll('/', `\\${path.sep}`)
    }
    throw new Error(`Expected exclusionList to be called with RegExp or string, got: ${typeof pattern}`)
  }

  return new RegExp(`(${additionalExclusions.concat(defaults).map(escapeRegExp).join('|')})$`)
}

const packageDirs = [
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/oca')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/remote-logs')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/core')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/verifier')),
  fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/react-native-attestation')),
  fs.realpathSync(path.join(__dirname, 'node_modules', 'react-native-bcsc-core')),
]

const watchFolders = [...packageDirs]

const extraExclusionList = []
const extraNodeModules = {}

for (const packageDir of packageDirs) {
  const pak = require(path.join(packageDir, 'package.json'))
  const modules = Object.keys({
    ...pak.peerDependencies,
    ...pak.devDependencies,
  })
  extraExclusionList.push(...modules.map((m) => path.join(packageDir, 'node_modules', m)))

  modules.reduce((acc, name) => {
    acc[name] = path.join(__dirname, 'node_modules', name)
    return acc
  }, extraNodeModules)
}

const defaultConfig = getDefaultConfig(__dirname)
const {
  resolver: { sourceExts, assetExts },
} = defaultConfig

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const combinedWatchFolders = Array.from(new Set([...(defaultConfig.watchFolders || []), ...watchFolders]))

const config = mergeConfig(defaultConfig, {
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
      // Remove console logs from production
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log'],
      },
    },
  },
  resolver: {
    ...defaultConfig.resolver,
    blockList: exclusionList(extraExclusionList.map((m) => new RegExp(`^${escape(m)}[/\\\\].*$`))),
    extraNodeModules: {
      ...(defaultConfig.resolver.extraNodeModules || {}),
      ...extraNodeModules,
    },
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg', 'cjs'],
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'require', 'browser'],
  },
  watchFolders: combinedWatchFolders,
  cacheStores: [
    new FileStore({
      root: path.join(__dirname, '.metro-cache'),
    }),
  ],
})

module.exports = config
