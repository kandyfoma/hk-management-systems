const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .wasm files
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('wasm');

// Shim Node.js built-ins that xlsx (and other packages) reference on web
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: path.resolve(__dirname, 'src/shims/empty.js'),
  crypto: path.resolve(__dirname, 'src/shims/empty.js'),
  stream: path.resolve(__dirname, 'src/shims/empty.js'),
};

// Web-specific configuration for MIME types
if (process.env.EXPO_PLATFORM === 'web') {
  config.server = {
    ...config.server,
    port: 8081,
  };
}

module.exports = config;