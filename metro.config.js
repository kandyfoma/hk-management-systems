const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .wasm files
config.resolver.assetExts.push('wasm');

// Ensure .wasm files are treated as assets
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;