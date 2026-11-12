/**
 * cPanel Production Startup File
 * Application: Cash Flow & Expense Management System
 * Architecture: Unified Express backend serving compiled React SPA frontend
 *
 * Compatible with:
 * - CloudLinux Node.js Selector (LiteSpeed lsnode Unix socket)
 * - Apache Passenger (PORT)
 * - Standard Node.js VPS / Docker
 */

const path = require('path');
const http = require('http');

// Force Prisma to use binary engine to prevent Tokio timer panic in LiteSpeed / CloudLinux LVE
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = 'binary';

// Ensure Node looks in server/node_modules as well
const serverNodeModules = path.resolve(__dirname, 'server/node_modules');
if (module.paths) {
  module.paths.unshift(serverNodeModules);
}
if (require('module').globalPaths) {
  require('module').globalPaths.unshift(serverNodeModules);
}

// Load environment variables from root or server directory
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch (_) {
  try {
    require(path.join(serverNodeModules, 'dotenv')).config({ path: path.resolve(__dirname, '.env') });
  } catch (e) {}
}

// LiteSpeed Node.js Selector Socket Patch
// On LiteSpeed servers, traffic is piped via a Unix Domain Socket instead of a TCP port.
const socketPath = process.env.LSNODE_SOCKET;
if (socketPath) {
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (...args) {
    const callback = args.find((a) => typeof a === 'function');
    return originalListen.call(this, socketPath, callback);
  };
  console.log(`[cPanel] LiteSpeed lsnode Unix socket detected: ${socketPath}`);
}

// Start compiled production Express application
try {
  require('./server/dist/index.js');
} catch (error) {
  console.error('[cPanel Startup Error] Failed to require ./server/dist/index.js:', error);
  process.exit(1);
}
