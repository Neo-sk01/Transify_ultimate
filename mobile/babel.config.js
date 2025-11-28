module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
            '@/components': './components',
            '@/modules': './modules',
            '@/services': './services',
            '@/types': './types',
            '@/utils': './utils',
            '@/lib': './lib',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
