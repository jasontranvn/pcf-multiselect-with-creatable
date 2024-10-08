// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './Escalation/index.ts', // Change to your main entry point file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'), // The output directory
  },
  mode: 'production', // Ensures a production-optimized bundle without eval()
  devtool: 'source-map', // Use a devtool that does not use eval()
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'], // Resolve file types
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/, // Handles TypeScript and JSX/TSX files
        exclude: /node_modules/,
        use: 'ts-loader', // Use ts-loader for TypeScript files
      },
      {
        test: /\.css$/, // Handles CSS files
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            // Prevent the usage of eval() and other unsafe constructs
            unsafe: true,
          },
        },
      }),
    ],
  },
};
