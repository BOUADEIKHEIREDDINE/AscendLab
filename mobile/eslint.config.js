// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // This rule guards against HTML parsing pitfalls; React Native <Text> renders
      // apostrophes and quotes literally, so plain "don't" in copy is correct here.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
