const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const fs = require('fs')
const path = require('path')
const escape = require('escape-string-regexp')
const exclusionList = require('metro-config/src/defaults/exclusionList')
const { FileStore } = require('metro-cache')

require('dotenv').config()

console.log('Metro Starting...')
console.log('NODE_ENV: ', process.env.NODE_ENV)

// ----------------------------------------------------------------------------
// Define local package directories
// ----------------------------------------------------------------------------
let packageDirs = []
const useLocalPackages = process.env.NODE_ENV !== 'production'

if (process.env.NODE_ENV === 'production') {
  packageDirs = [
    fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/oca')),
    fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/remote-logs')),
    fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/core')),
    fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/verifier')),
    fs.realpathSync(path.join(__dirname, 'node_modules', '@bifold/react-native-attestation')),
    fs.realpathSync(path.join(__dirname, 'node_modules', 'react-native-bcsc-core')),
  ]
} else {
  console.log('🧩 Metro: Running in development mode — using local packages')
  packageDirs = [
    fs.realpathSync(path.join(__dirname, '../bifold/packages/core')),
    fs.realpathSync(path.join(__dirname, '../bifold/packages/oca')),
    fs.realpathSync(path.join(__dirname, '../bifold/packages/remote-logs')),
    fs.realpathSync(path.join(__dirname, '../bifold/packages/verifier')),
    fs.realpathSync(path.join(__dirname, '../bifold/packages/react-native-attestation')),
    fs.realpathSync(path.join(__dirname, 'node_modules', 'react-native-bcsc-core')),
  ]
}

const watchFolders = [...packageDirs]
console.log('Watching package dirs: ', watchFolders)

// ----------------------------------------------------------------------------
// Build up Metro resolver configuration dynamically
// ----------------------------------------------------------------------------
const extraExclusionlist = []
const extraNodeModules = {}
const localPackageEntryPoints = new Map()

for (const packageDir of packageDirs) {
  console.log('Package Dir: ', packageDir)
  const pkgJsonPath = path.join(packageDir, 'package.json')
  if (!fs.existsSync(pkgJsonPath)) continue

  const pak = require(pkgJsonPath)

  // Store local entry points for custom resolution
  if (useLocalPackages && pak['local-react-native']) {
    const localEntryPath = path.join(packageDir, pak['local-react-native'])
    if (fs.existsSync(localEntryPath)) {
      console.log(`🔗 Using local-react-native for ${pak.name}: ${localEntryPath}`)
      localPackageEntryPoints.set(pak.name, localEntryPath)

      // Ensure we watch the entire package directory
      if (!watchFolders.includes(packageDir)) {
        watchFolders.push(packageDir)
      }
    } else {
      console.warn(`⚠️ local-react-native path not found for ${pak.name}: ${localEntryPath}`)
    }
  }

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

// ----------------------------------------------------------------------------
// Export final Metro configuration
// ----------------------------------------------------------------------------
module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig()

  const metroConfig = {
    projectRoot: path.resolve(__dirname, './'),
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: process.env.LOAD_STORYBOOK !== 'true',
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
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
      },
    },
    resolver: {
      unstable_enableSymlinks: true,
      blacklistRE: exclusionList(extraExclusionlist.map((m) => new RegExp(`^${escape(m)}\\/.*$`))),
      extraNodeModules,
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'ts', 'tsx', 'svg', 'cjs'],

      // Custom resolver to handle local development entry points
      resolveRequest: (context, realModuleName, platform, moduleName) => {
        // Check if this is a request for a package we have local entry points for
        if (useLocalPackages && localPackageEntryPoints.has(realModuleName)) {
          const localEntryPath = localPackageEntryPoints.get(realModuleName)
          console.log(`🪄 Metro resolving "${realModuleName}" to local entry: ${localEntryPath}`)

          return {
            filePath: localEntryPath,
            type: 'sourceFile',
          }
        }

        // Check for submodule requests (e.g., @bifold/core/components)
        for (const [packageName, entryPath] of localPackageEntryPoints.entries()) {
          if (realModuleName.startsWith(packageName + '/')) {
            const subPath = realModuleName.slice(packageName.length + 1)
            const packageDir = path.dirname(entryPath)
            const subModulePath = path.join(packageDir, subPath)

            // Try different extensions
            const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
            for (const ext of extensions) {
              const fullPath = subModulePath + ext
              if (fs.existsSync(fullPath)) {
                console.log(`🪄 Metro resolving "${realModuleName}" to local submodule: ${fullPath}`)
                return {
                  filePath: fullPath,
                  type: 'sourceFile',
                }
              }
            }

            // Try index files
            for (const ext of extensions) {
              const indexPath = path.join(subModulePath, 'index' + ext)
              if (fs.existsSync(indexPath)) {
                console.log(`🪄 Metro resolving "${realModuleName}" to local index: ${indexPath}`)
                return {
                  filePath: indexPath,
                  type: 'sourceFile',
                }
              }
            }
          }
        }

        // Fall back to default resolution
        return context.resolveRequest(context, realModuleName, platform, moduleName)
      },
    },
    watchFolders,
    cacheStores: [
      new FileStore({
        root: path.join(__dirname, '.metro-cache'),
      }),
    ],
  }

  return mergeConfig(getDefaultConfig(__dirname), metroConfig)
})()
