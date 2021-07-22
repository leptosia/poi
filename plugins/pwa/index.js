const normalizePath = require('normalize-path')
const { GenerateSW } = require('workbox-webpack-plugin')

exports.name = 'pwa'

// Only use this plugin for web target
exports.when = api => api.config.output.target === 'web'

exports.apply = (api, options = {}) => {
  const pluginOptions = Object.assign(
    {
      navigateFallbackWhitelist: [/^(?!\/__).*/],
      navigateFallback: 'index.html',
      exclude: [
        /\.git/,
        /\.map$/,
        /\.DS_Store/,
        /^manifest.*\.js(?:on)?$/,
        /\.gz(ip)?$/,
        /\.br$/
      ]
    },
    options.workboxOptions,
    {
      swDest: 'service-worker.js'
    }
  )

  api.hook('createWebpackChain', config => {
    if (api.mode === 'production') {
      config.plugin('workbox').use(GenerateSW, [pluginOptions])
    }

    // Copy the public/manifest.json to dist/manifest.json
    // Since in `--serve` public folder are not copied but directly served as static assets
    if (api.cli.options.serve && api.config.publicFolder) {
      config.plugin('copy-manifest-json').use(api.webpackUtils.CopyPlugin, [
        [
          {
            // Pretend to be a glob pattern
            // TODO: newly added manifest.json won't trigger copy
            from: normalizePath(
              api.resolveCwd(
                api.config.publicFolder,
                '{manifest,manifest}.json'
              )
            ),
            to: '[name].[ext]',
            toType: 'template'
          }
        ]
      ])
    }

    // Inject PWA tags in HTML
    // Generate / update manifest.json
    const page = api.config.pages && Object.keys(api.config.pages)[0]
    const htmlWebpackPluginName = page ? `html-page-${page}` : null
    const HtmlWebpackPlugin = config.plugins.has(htmlWebpackPluginName)
      ? config.plugin(htmlWebpackPluginName).get('plugin')
      : config.plugin('html').get('plugin')
    config
      .plugin('pwa-html')
      .use(require('pwa-html-webpack-plugin'), [options, HtmlWebpackPlugin])
  })
}
