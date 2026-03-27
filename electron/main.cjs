const { app } = require('electron');
const { createMainWindow, getMainWindow } = require('./windowManager.cjs');
const { startBackend, stopBackend } = require('./backendManager.cjs');
const { startTunnel, stopTunnel } = require('./tunnelManager.cjs');
const { registerIpcHandlers } = require('./ipcHandlers.cjs');
const { setupAutoUpdater } = require('./updateManager.cjs');
const { log } = require('./logger.cjs');

const isDev = process.env.NODE_ENV === 'development';

function init() {
  log(`[MAIN] Initializing Rexermi OS (Version: ${app.getVersion()})`);

  // 1. Start Backend and Tunnel
  startBackend(isDev, () => {
    startTunnel('auto', null, (url) => {
      const win = getMainWindow();
      if (win) win.webContents.send('tunnel-ready', url);
    });
  });

  // 2. Create UI
  createMainWindow(isDev);

  // 3. Register IPC Handlers
  registerIpcHandlers();

  // 4. Setup Auto-updater
  setupAutoUpdater();
}

app.on('ready', init);

app.on('window-all-closed', () => {
  log('[MAIN] All windows closed');
  if (process.platform !== 'darwin') {
    stopBackend();
    stopTunnel();
    app.quit();
  }
});

app.on('activate', () => {
  if (getMainWindow() === null) {
    createMainWindow(isDev);
  }
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}
