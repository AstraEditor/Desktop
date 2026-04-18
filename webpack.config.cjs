const path = require('path');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const refractorPath = request => {
    const path = require('path');
    const refractorDir = path.resolve(__dirname, '../scratch-gui/node_modules/refractor');
    
    // 检查refractor目录是否存在，如果不存在则使用scratch-gui/node_modules/refractor
    if (require('fs').existsSync(refractorDir)) {
        return path.resolve(
            refractorDir,
            request === 'core' || request === 'all' ?
                'lib/' + request + '.js' :
                'lang/' + request + '.js'
        );
    } else {
        // 如果refractor不存在，返回一个空模块以避免构建失败
        return path.resolve(__dirname, 'empty-module.js');
    }
};

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
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
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
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
