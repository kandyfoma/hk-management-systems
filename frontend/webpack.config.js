const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAllowSyncTransformation: true,
    },
  }, argv);

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

  // Configure resolve for TypeScript
  config.resolve = {
    ...config.resolve,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.wasm'],
    alias: {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    },
  };

  // Configure dev server with proper MIME types
  config.devServer = {
    ...config.devServer,
    port: 8081,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
    static: {
      ...config.devServer?.static,
      serveIndex: true,
    },
    setupMiddlewares: (middlewares, devServer) => {
      // Add middleware to fix MIME types
      devServer.app.use((req, res, next) => {
        if (req.url && req.url.includes('.bundle')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (req.url && req.url.includes('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (req.url && req.url.includes('.map')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        next();
      });
      return middlewares;
    },
  };

  // Ensure proper output configuration
  config.output = {
    ...config.output,
    publicPath: '/',
  };

  return config;
};