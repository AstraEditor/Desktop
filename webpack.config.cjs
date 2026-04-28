const path = require('path');
const { DefinePlugin, ProvidePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const refractorPath = request => path.resolve(
    __dirname,
    request === 'core' || request === 'all' ?
        '../scratch-gui/node_modules/refractor/lib/' + request + '.js' :
        '../scratch-gui/node_modules/refractor/lang/' + request + '.js'
);
const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                // Override package.json "type": "commonjs" so webpack 5 auto-detects
                // ESM/CJS for each file instead of treating all .js files as CommonJS.
                type: 'javascript/auto',
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            },
            {
                test: /\.(svg|png|wav|gif|jpg|mp3|woff2|hex)$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'static/assets/',
                    esModule: false
                }
            },
            {
                test: /\.(vert|frag|glsl)$/,
                loader: 'raw-loader',
                options: {
                    esModule: false
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: {
                                localIdentName: '[name]_[local]_[hash:base64:5]',
                                exportLocalsConvention: 'camelCase'
                            }
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
    },
    resolve: {
        fallback: {
            "path": require.resolve("path-browserify")
        },
        // webpack 5 respects the "exports" field in package.json, which breaks
        // older packages like htmlparser2@3.10.0 that import un-exported paths.
        // Disable to restore webpack 4 behavior for these legacy dependencies.
        exportsFields: []
    }
}

module.exports = [
    {
        name: 'gui',
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/gui'),
            filename: '[name].js'
        },
        entry: {
            index: './src-renderer-webpack/editor/gui/index.jsx'
        },
        plugins: [
            new DefinePlugin({
                'process.env.ROOT': '""'
            }),
            new ProvidePlugin({
                // webpack 5 no longer auto-polyfills process; provide it for
                // dependencies that reference process.env.* or process directly.
                process: 'process/browser'
            }),
new (require('webpack')).NormalModuleReplacementPlugin(/^refractor\/(.+)$/, resource => {
    resource.request = refractorPath(resource.request.slice('refractor/'.length));
}),
new (require('webpack')).NormalModuleReplacementPlugin(/^refractor$/, () => {
    return 'empty-module';
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
                        from: 'submit',
                        to: 'submit'
                    },
                    {
                        context: 'src-renderer-webpack/editor/gui/',
                        from: '*.html'
                    }
                ]
            })
        ],
        resolve: {
            ...base.resolve,
            modules: [
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname, 'node_modules/scratch-gui/node_modules'),
                'node_modules'
            ],
            alias: {
                // Force single React copy to avoid "Invalid hook call" errors
                'react': path.resolve(__dirname, 'node_modules/react'),
                'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
                'scratch-gui$': path.resolve(__dirname, 'node_modules/scratch-gui/src/index.js'),
                'scratch-gui/': path.resolve(__dirname, 'node_modules/scratch-gui/src/'),
                'scratch-render-fonts$': path.resolve(__dirname, 'node_modules/scratch-gui/src/lib/tw-scratch-render-fonts'),
                // Aliases for dynamic requires in AppStateHOC
                '../reducers/gui': path.resolve(__dirname, 'node_modules/scratch-gui/src/reducers/gui.js'),
                './tw-scratch-paint': path.resolve(__dirname, 'node_modules/scratch-gui/src/lib/tw-scratch-paint.js'),
            }
        }
    },

    {
        name: 'addons',
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/addons'),
            filename: '[name].js'
        },
        entry: {
            addons: './src-renderer-webpack/editor/addons/index.jsx'
        },
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
