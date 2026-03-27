const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const { log, error } = require('./logger.cjs');
const { getMainWindow } = require('./windowManager.cjs');

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  log('[UPDATE-MNG] Setting up auto-updater...');

  autoUpdater.on('checking-for-update', () => {
    log('[UPDATE-MNG] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log(`[UPDATE-MNG] Update available: ${info.version}`);
    const win = getMainWindow();
    if (win) win.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log('[UPDATE-MNG] Update not available');
  });

  autoUpdater.on('error', (err) => {
    error(`[UPDATE-MNG] Error in auto-updater: ${err}`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const win = getMainWindow();
    if (win) win.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log(`[UPDATE-MNG] Update downloaded: ${info.version}`);
    const win = getMainWindow();
    if (win) win.webContents.send('update-downloaded', info);
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = {
  setupAutoUpdater,
};
