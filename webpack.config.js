const path = require('path');
const { NODE_ENV = 'production' } = process.env;
const isDev = NODE_ENV.includes('dev'); 

module.exports = {

  mode: isDev
    ? 'development'
    : 'production',
  entry: path.resolve(__dirname, 'client', 'src', 'index.jsx'),
  output: {
    filename: 'bundles.js',
    path: path.resolve(__dirname, 'client', 'dist')
  },
  watch: isDev,
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: ['@babel/transform-runtime']
          }
        }
      },
      {
        test: /\.(png|jpg)$/, 
        use: {
          loader: 'url-loader?limit=8192'
        }
        
      },
      {
        test: /\.(jpg|png|jpeg)$/,
        use: {
          loader: 'url-loader',
        },
      },
    ]
  }

};
