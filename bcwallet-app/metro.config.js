const path = require('path');
const escape = require('escape-string-regexp')
const exclusionList = require('metro-config/src/defaults/exclusionList')
const packageDirs = [
  path.resolve(__dirname, '../aries-bifold'),
  path.resolve(__dirname, '../bcwallet-core')
]

const watchFolders = [
  ...packageDirs,
  path.resolve(__dirname),
];

const extraExclusionlist = []
const extraNodeModules = {}

for (const packageDir of packageDirs) {
  const pak = require(path.join(packageDir, 'package.json'))
  const modules = Object.keys({
    ...pak.peerDependencies,
  })
  extraExclusionlist.push(...modules.map((m) => new RegExp(`^${escape(path.join(packageDir, 'node_modules', m))}\\/.*$`)))
  modules.reduce((acc, name) => {
    acc[name] = path.join(__dirname, 'node_modules', name)
    return acc
  }, extraNodeModules)
}

const { getDefaultConfig } = require('metro-config')
module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig()
  const metroConfig = {
    projectRoot: __dirname,
    /*resetCache: true,*/
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      blacklistRE: exclusionList(extraExclusionlist),
      extraNodeModules: extraNodeModules,
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
    watchFolders,
  };
  // eslint-disable-next-line no-console
  console.dir(metroConfig)
  return metroConfig
})()