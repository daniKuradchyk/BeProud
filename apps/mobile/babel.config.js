module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Reanimated plugin DEBE ir el último. Sin él, los worklets dan
    // "__reanimatedLoggerConfig is not defined" en runtime cuando se
    // usan APIs como useAnimatedStyle, withSpring, FadeIn, etc.
    plugins: ['react-native-reanimated/plugin'],
  };
};
