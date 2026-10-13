const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

// Redirect native-only packages to web stubs when bundling for web
const webStubs = {
  'react-native-maps': path.resolve(__dirname, 'src/mocks/react-native-maps.stub.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { filePath: webStubs[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Proxy /api requests to local backend (or configured API) when running Expo in web browser on localhost
function getProxyTarget() {
  try {
    const fs = require('fs');
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^EXPO_PUBLIC_API_URL=(.+)$/m);
      if (match) {
        const val = match[1].trim();
        if (val === 'local' || val.includes('localhost:5000') || val.includes('127.0.0.1:5000')) {
          return 'http://localhost:5000';
        }
        if (val && val !== 'auto') {
          return val.replace(/\/api\/?$/, '');
        }
      }
    }
  } catch {}
  const targetUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (targetUrl === 'local' || targetUrl?.includes('localhost:5000') || targetUrl?.includes('127.0.0.1:5000')) {
    return 'http://localhost:5000';
  }
  return targetUrl && targetUrl !== 'auto' ? targetUrl.replace(/\/api\/?$/, '') : 'http://localhost:5000';
}

let currentTarget = null;
let apiProxy = null;

function getApiProxy() {
  const target = getProxyTarget();
  if (!apiProxy || currentTarget !== target) {
    currentTarget = target;
    console.log('[Metro] Proxying /api requests to:', currentTarget);
    apiProxy = createProxyMiddleware({
      target: currentTarget,
      changeOrigin: true,
      secure: false,
    });
  }
  return apiProxy;
}

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const app = originalEnhanceMiddleware ? originalEnhanceMiddleware(metroMiddleware, server) : metroMiddleware;
    return (req, res, next) => {
      if (req.url.startsWith('/api')) {
        return getApiProxy()(req, res, next);
      }
      return app(req, res, next);
    };
  },
};

module.exports = config;
