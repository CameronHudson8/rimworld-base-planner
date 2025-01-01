'use strict';

const fs = require('fs');
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware');
const paths = require('./paths');

// Host and socket configuration derived from environment variables
const host = process.env.HOST || '0.0.0.0';
const sockHost = process.env.WDS_SOCKET_HOST;
const sockPath = process.env.WDS_SOCKET_PATH; // default: '/ws'
const sockPort = process.env.WDS_SOCKET_PORT;

/**
 * Creates the devServer configuration.
 * @param {Object} proxy - The proxy configuration, if any.
 * @param {string} allowedHost - Whitelisted hostname or domain for development.
 * @returns {Object} A webpack-dev-server config object.
 */
module.exports = function (proxy, allowedHost) {
  // If there is no proxy or if the user chooses to disable the host check, 
  // we allow all hosts (disable firewall). Otherwise, we enable the firewall
  // for security.
  const disableFirewall =
    !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true';

  return {
    // Allowed hosts:
    // - "all" means any host is permitted if disableFirewall is true
    // - If not disabled, we explicitly set the single allowedHost
    allowedHosts: disableFirewall ? 'all' : [allowedHost],

    // Common security headers
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },

    // Enable gzip compression for served files
    compress: true,

    // Provide static file hosting from the public folder
    static: {
      directory: paths.appPublic,
      // Public path: ensures the correct base path for served files
      publicPath: [paths.publicUrlOrPath],
      // Watch settings for auto-reloading
      watch: {
        ignored: ignoredFiles(paths.appSrc),
      },
    },

    // Webpack Dev Client configuration
    client: {
      webSocketURL: {
        hostname: sockHost,
        pathname: sockPath,
        port: sockPort,
      },
      overlay: {
        errors: true,
        warnings: false,
      },
    },

    // Middleware controlling the webpack output path
    devMiddleware: {
      // The publicPath must match the same "publicPath" set in the Webpack config
      publicPath: paths.publicUrlOrPath.slice(0, -1),
    },

    // The server host used for dev
    host,

    // Support for HTML5 History API based routing
    historyApiFallback: {
      disableDotRule: true,
      index: paths.publicUrlOrPath,
    },

    // Provide an optional HTTP proxy for your backend
    proxy,

    // Fine-tune how the devServer sets up middlewares
    setupMiddlewares: (middlewares, devServer) => {
      // 1) Source Map Middleware: helps fetch source contents for error overlay
      devServer.app.use(evalSourceMapMiddleware(devServer));

      // 2) Register additional user-provided middleware if `proxySetup.js` exists
      if (fs.existsSync(paths.proxySetup)) {
        require(paths.proxySetup)(devServer.app);
      }

      // Example of how to prepend or append custom middleware:
      // middlewares.unshift({ name: "my-first-middleware", path: "/before", middleware: (req, res) => { /* ... */ } });
      // middlewares.push({ name: "my-last-middleware", path: "/after", middleware: (req, res) => { /* ... */ } });

      // 3) Redirect requests if they don’t match (for correct base path usage)
      devServer.app.use(redirectServedPath(paths.publicUrlOrPath));

      // 4) Service worker reset - ensures old service workers don't cause conflicts
      devServer.app.use(noopServiceWorkerMiddleware(paths.publicUrlOrPath));

      return middlewares;
    },
  };
};
