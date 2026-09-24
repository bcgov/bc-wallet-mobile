const presets = ['module:@react-native/babel-preset']
const plugins = [
  '@babel/plugin-transform-export-namespace-from',
  // @owf/mdoc (via credo 0.7 openid4vc) ships static class blocks
  '@babel/plugin-transform-class-static-block',
  [
    'module-resolver',
    {
      root: ['.'],
      extensions: ['.tsx', 'ts'],
      alias: {
        '@': './src',
        '@mocks': './__mocks__',
        '@assets': './src/assets',
        '@bcwallet-theme': './src/bcwallet-theme',
        '@bcsc-theme': './src/bcsc-theme',
        '@components': './src/components',
        '@events': './src/events',
        '@hooks': './src/hooks',
        '@screens': './src/screens',
        '@services': './src/services',
        '@types': './src/types',
        '@utils': './src/utils',
      },
    },
  ],
]

if (process.env['ENV'] === 'prod') {
  plugins.push('transform-remove-console')
}

// react-native-worklets plugin must be listed last (moved out of reanimated in v4)
plugins.push('react-native-worklets/plugin')

module.exports = {
  presets,
  plugins,
}
