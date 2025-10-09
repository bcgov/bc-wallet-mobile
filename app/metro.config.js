const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const fs = require('fs')
const path = require('path')
const escape = require('escape-string-regexp')
const exclusionList = require('metro-config/src/defaults/exclusionList')

require('dotenv').config()

const useLocalPackages = process.env.USE_LOCAL_PACKAGES === 'true'

console.log('🚀 Metro starting')
console.log('Using local packages: ', useLocalPackages)

// ----------------------------------------------------------------------------
// Package configuration
// ----------------------------------------------------------------------------
const PACKAGES = [
  '@bifold/core',
  '@bifold/oca',
  '@bifold/remote-logs',
  '@bifold/verifier',
  '@bifold/react-native-attestation',
  'react-native-bcsc-core',
]

const getPackagePaths = () => {
  const paths = []

  for (const pkg of PACKAGES) {
    if (pkg.startsWith('@bifold') && useLocalBifold) {
      const localPath = path.join(__dirname, '../bifold/packages', pkg.replace('@bifold/', ''))
      if (fs.existsSync(localPath)) {
        paths.push(fs.realpathSync(localPath))
        console.log(`📦 Using local ${pkg}`)
        continue
      }
      console.log(`⚠️ Local path not found for ${pkg}, falling back to npm`)
    }

    // Fallback to node_modules
    paths.push(fs.realpathSync(path.join(__dirname, 'node_modules', pkg)))
    console.log(`📦 Using npm ${pkg}`)
  }

  return paths
}

// ----------------------------------------------------------------------------
// Local TypeScript resolution for development
// ----------------------------------------------------------------------------
const getLocalEntryPoints = (packageDirs) => {
  const entryPoints = new Map()

  if (!useLocalPackages) return entryPoints

  for (const packageDir of packageDirs) {
    const pkgJsonPath = path.join(packageDir, 'package.json')
    if (!fs.existsSync(pkgJsonPath)) continue

    const pkg = require(pkgJsonPath)

    if (pkg['local-react-native']) {
      const localEntryPath = path.join(packageDir, pkg['local-react-native'])
      if (fs.existsSync(localEntryPath)) {
        entryPoints.set(pkg.name, localEntryPath)
        console.log(`🔗 ${pkg.name} -> ${pkg['local-react-native']}`)
      }
    }
  }

  return entryPoints
}

// ----------------------------------------------------------------------------
// Build resolver configuration
// ----------------------------------------------------------------------------
const buildResolverConfig = (packageDirs) => {
  const exclusions = []
  const extraNodeModules = {}

  for (const packageDir of packageDirs) {
    const pkgJsonPath = path.join(packageDir, 'package.json')
    if (!fs.existsSync(pkgJsonPath)) continue

    const pkg = require(pkgJsonPath)
    const deps = { ...pkg.peerDependencies, ...pkg.devDependencies }

    // Exclude nested node_modules to prevent duplication
    for (const depName of Object.keys(deps)) {
      exclusions.push(path.join(packageDir, 'node_modules', depName))
      extraNodeModules[depName] = path.join(__dirname, 'node_modules', depName)
    }
  }

  return { exclusions, extraNodeModules }
}

// ----------------------------------------------------------------------------
// Custom resolver for local development
// ----------------------------------------------------------------------------
const createCustomResolver = (localEntryPoints) => {
  if (localEntryPoints.size === 0) return undefined

  return (context, realModuleName, platform, moduleName) => {
    // Direct package resolution
    if (localEntryPoints.has(realModuleName)) {
      return {
        filePath: localEntryPoints.get(realModuleName),
        type: 'sourceFile',
      }
    }

    // Submodule resolution (e.g., @bifold/core/components)
    for (const [packageName, entryPath] of localEntryPoints.entries()) {
      if (realModuleName.startsWith(packageName + '/')) {
        const subPath = realModuleName.slice(packageName.length + 1)
        const packageDir = path.dirname(entryPath)

        const tryExtensions = ['.ts', '.tsx', '.js', '.jsx']
        const tryPaths = [subPath, path.join(subPath, 'index')]

        for (const basePath of tryPaths) {
          for (const ext of tryExtensions) {
            const fullPath = path.join(packageDir, basePath + ext)
            if (fs.existsSync(fullPath)) {
              return { filePath: fullPath, type: 'sourceFile' }
            }
          }
        }
      }
    }

    // Fall back to default resolution
    return context.resolveRequest(context, realModuleName, platform, moduleName)
  }
}

// ----------------------------------------------------------------------------
// Main configuration
// ----------------------------------------------------------------------------
module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig()

  const packageDirs = getPackagePaths()
  const localEntryPoints = getLocalEntryPoints(packageDirs)
  const { exclusions, extraNodeModules } = buildResolverConfig(packageDirs)

  const config = {
    transformer: {
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
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
      },
    },
    resolver: {
      unstable_enableSymlinks: true,
      blacklistRE: exclusionList(exclusions.map((m) => new RegExp(`^${escape(m)}\\/.*$`))),
      extraNodeModules,
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg', 'cjs'],
      resolveRequest: createCustomResolver(localEntryPoints),
    },
    watchFolders: packageDirs,
  }

  return mergeConfig(getDefaultConfig(__dirname), config)
})()
