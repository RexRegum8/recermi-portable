const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { log, error, warn } = require('./logger.cjs');

let tunnelProcess = null;
let lastTunnelUrl = '';

function startTunnel(mode = 'auto', token = null, onUrlDetected) {
  if (tunnelProcess) return;

  log(`[TUNNEL-MNG] Starting Cloudflared tunnel [${mode}]...`);
  log(`[TUNNEL-MNG] process.resourcesPath: ${process.resourcesPath}`);
  log(`[TUNNEL-MNG] __dirname: ${__dirname}`);
  const isPackaged = app.isPackaged;
  log(`[TUNNEL-MNG] isPackaged: ${isPackaged}`);
  let cloudflaredPath = '';

  if (isPackaged) {
    // Try app.asar.unpacked first
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'bin/cloudflared.exe');
    // Fallback to standard resources/app/bin (some portable builds)
    const standardPath = path.join(process.resourcesPath, 'app/bin/cloudflared.exe');
    
    if (fs.existsSync(unpackedPath)) {
      cloudflaredPath = unpackedPath;
    } else if (fs.existsSync(standardPath)) {
      cloudflaredPath = standardPath;
    }
  } else {
    cloudflaredPath = path.join(__dirname, '..', 'bin/cloudflared.exe');
  }

  if (!cloudflaredPath || !fs.existsSync(cloudflaredPath)) {
    warn(`[TUNNEL-MNG] cloudflared.exe not found at ${cloudflaredPath}, skipping tunnel`);
    return;
  }

  const args = mode === 'custom' && token
    ? ['tunnel', '--protocol', 'http2', 'run', '--token', token]
    : ['tunnel', '--url', 'http://localhost:3001', '--protocol', 'http2'];

  tunnelProcess = spawn(cloudflaredPath, args, { windowsHide: true });

  tunnelProcess.stderr.on('data', (data) => {
    const str = data.toString();
    // Forward to logger if needed, but cloudflared is chatty
    
    // Auto-detect Quick Tunnel URL
    const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      lastTunnelUrl = match[0];
      log(`[TUNNEL-MNG] Tunnel ready: ${lastTunnelUrl}`);
      if (onUrlDetected) {
        onUrlDetected(lastTunnelUrl);
      }
    }
  });

  tunnelProcess.on('exit', (code) => {
    warn(`[TUNNEL-MNG] Tunnel process exited with code ${code}`);
    tunnelProcess = null;
  });

  return tunnelProcess;
}

function stopTunnel() {
  if (tunnelProcess) {
    log('[TUNNEL-MNG] Stopping tunnel...');
    tunnelProcess.kill();
    tunnelProcess = null;
    lastTunnelUrl = '';
  }
}

function getLastTunnelUrl() {
  return lastTunnelUrl;
}

module.exports = {
  startTunnel,
  stopTunnel,
  getLastTunnelUrl,
};
