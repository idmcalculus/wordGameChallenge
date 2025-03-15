const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const DotenvPlugin = require('dotenv-webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ESLintPlugin = require('eslint-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      main: './src/js/app.js',
    },
    output: {
      filename: 'js/[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      hot: true,
      port: 8080,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.(css|scss)$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]'
          }
        }
      ]
    },
    plugins: [
      // Temporarily disable ESLint for production build
      // new ESLintPlugin({
      //   extensions: ['js'],
      //   emitWarning: true,
      //   failOnError: isProduction,
      //   eslintPath: 'eslint',
      // }),
      new DotenvPlugin({
        systemvars: true, // Load all system environment variables as well
        safe: true, // Load '.env.example' to verify the '.env' variables are all set
        defaults: false // Don't load '.env.defaults'
      }),
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true
        } : false
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'css/[name].[contenthash].css'
        }),
        new CopyPlugin({
          patterns: [
            { 
              from: 'src/assets', 
              to: 'assets',
              noErrorOnMissing: true
            },
            {
              from: 'src/manifest.json',
              to: 'manifest.json'
            }
          ],
        })
      ] : []),
      ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : []),
      ...(isProduction ? [
        new WorkboxPlugin.GenerateSW({
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          runtimeCaching: [
            {
              urlPattern: new RegExp('^https://api\\.datamuse\\.com/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
              },
            },
          ],
        }),
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240, // Only compress files larger than 10kb
          minRatio: 0.8, // Only compress files that compress well
        })
      ] : [])
    ],
    optimization: {
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the name. E.g. node_modules/packageName/not/this/part.js
              // or node_modules/packageName
              const packageName = module.context.match(/[\\/]node_modules[\\/]([^\\/]+)/)[1];
              // Create a hash to avoid chunk name collisions
              return `npm.${packageName.replace('@', '')}`;
            },
          },
          // Split game logic into separate chunks
          gameLogic: {
            test: /[\\/]src[\\/]js[\\/]WordGame\.js/,
            name: 'game-logic',
            chunks: 'all',
          },
          uiComponents: {
            test: /[\\/]src[\\/]js[\\/]uiHandler\.js/,
            name: 'ui-components',
            chunks: 'all',
          },
        },
      },
      minimize: isProduction,
      minimizer: isProduction ? [
        '...', // Use the default minimizers (terser for JS)
      ] : [],
    }
  };
};
