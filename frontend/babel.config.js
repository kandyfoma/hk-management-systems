module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { 
        jsxImportSource: 'react',
        web: { 
          unstable_transformProfile: 'hermes-stable' 
        } 
      }]
    ],
    plugins: [
      // Add any required plugins here
    ]
  };
};