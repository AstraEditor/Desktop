const path = require('path');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
    target: 'web',
    optimization: {
        splitChunks: false,
        minimize: false
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            },

            // SVG loader - Use file-loader for all SVGs to ensure proper URL generation
            {
                test: /\.svg$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'static/assets/',
                    esModule: false
                }
            },

            // 原来的资源 loader
            {
                test: /\.(png|jpg|gif|mp3|wav|woff2|hex)$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'static/assets/',
                    esModule: false
                }
            },

            // CSS（保持你的即可）
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            importLoaders: 1,
                            localIdentName: '[name]_[local]_[hash:base64:5]',
                            camelCase: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    'postcss-import',
                                    'postcss-simple-vars',
                                    'autoprefixer'
                                ]
                            }
                        }
                    }
                ]
            }
        ]
    }

}

module.exports = [
    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/gui'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/gui/index.jsx',
        plugins: [
            new DefinePlugin({
                'process.env.ROOT': '""'
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/default'
                    },
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/high-contrast'
                    },
                    {
                        from: 'node_modules/scratch-gui/src/lib/themes/blocks/high-contrast-media/blocks-media',
                        to: 'static/blocks-media/high-contrast',
                        force: true
                    },
                    {
                        context: 'src-renderer-webpack/editor/gui/',
                        from: '*.html'
                    }
                ]
            })
        ],
        resolve: {
            modules: [
                'node_modules',
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname, '../scratch-gui/node_modules')
            ],
            alias: {
                'scratch-gui/src': path.resolve(__dirname, '../scratch-gui/src'),
                'scratch-gui': path.resolve(__dirname, '../scratch-gui/src'),
                'scratch-vm': path.resolve(__dirname, '../scratch-vm/src'),
                'scratch-audio': path.resolve(__dirname, '../scratch-audio/src'),
                'scratch-blocks': path.resolve(__dirname, '../scratch-blocks'),
                'scratch-paint': path.resolve(__dirname, '../scratch-paint/src'),
                'scratch-render': path.resolve(__dirname, '../scratch-render/src'),
                '@turbowarp/l10n': path.resolve(__dirname, '../scratch-gui/node_modules/@turbowarp/scratch-l10n'),
                '@turbowarp/scratch-l10n': path.resolve(__dirname, '../scratch-gui/node_modules/@turbowarp/scratch-l10n'),
                'react': path.resolve(__dirname, 'node_modules/react'),
                'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
            },
            extensions: ['.js', '.jsx']
        }
    },

    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/addons'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/addons/index.jsx',
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: 'src-renderer-webpack/editor/addons/',
                        from: '*.html'
                    }
                ]
            })
        ]
    }
];
