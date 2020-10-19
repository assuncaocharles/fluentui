const resources = require('../../scripts/webpack/webpack-resources');

module.exports = resources.createServeConfig(
  {
    entry: './src/index.tsx',
    output: {
      filename: 'todo-app.js',
    },

    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
  },
  'dist',
);
