const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .wasm files
config.resolver.assetExts.push('wasm');

// Ensure .wasm files are treated as assets
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configure source extensions with proper order
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'wasm'];

// Web-specific configuration for MIME types
if (process.env.EXPO_PLATFORM === 'web') {
  config.server = {
    ...config.server,
    port: 8081,
  };
}

module.exports = config;