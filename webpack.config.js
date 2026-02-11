const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add support for WebAssembly files
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Set experiments to support WebAssembly
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  return config;
};