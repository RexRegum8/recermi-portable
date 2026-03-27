const { ipcMain, app, shell, dialog } = require('electron');
const { getMainWindow } = require('./windowManager.cjs');
const { startBackend } = require('./backendManager.cjs');
const { startTunnel, stopTunnel, getLastTunnelUrl } = require('./tunnelManager.cjs');
const { log } = require('./logger.cjs');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

function registerIpcHandlers() {
  log('[IPC-HANDLERS] Registering IPC handlers...');

  ipcMain.on('start-backend', (event, customPath) => {
    startBackend(process.env.NODE_ENV === 'development', startTunnel, customPath);
  });

  ipcMain.on('get-tunnel-url', (event) => {
    event.returnValue = getLastTunnelUrl();
  });

  ipcMain.on('update-tunnel-config', (event, { mode, token }) => {
    log(`[IPC] Updating tunnel config: Mode=${mode}`);
    stopTunnel();
    setTimeout(() => {
        startTunnel(mode, token, (url) => {
            const win = getMainWindow();
            if (win) win.webContents.send('tunnel-ready', url);
        });
    }, 1000);
  });

  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.on('check-updates', () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('check-backup', async () => {
    const userDataPath = app.getPath('userData');
    const backupPath = path.join(userDataPath, 'rexermi.db.bak');
    return fs.existsSync(backupPath);
  });

  ipcMain.handle('check-db-exists', async () => {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'rexermi.db');
    return fs.existsSync(dbPath);
  });

  ipcMain.handle('restore-backup', async () => {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'rexermi.db');
    const backupPath = path.join(userDataPath, 'rexermi.db.bak');

    if (fs.existsSync(backupPath)) {
      try {
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, path.join(userDataPath, 'rexermi.db.pre-restore.bak'));
        }
        fs.copyFileSync(backupPath, dbPath);
        return true;
      } catch (e) {
        log(`[IPC] Restore failed: ${e.message}`);
        return false;
      }
    }
    return false;
  });

  ipcMain.handle('select-db-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Seleccionar Base de Datos Rexermi',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });

  ipcMain.handle('get-db-info', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return { exists: false };
      const stats = fs.statSync(filePath);
      return { 
        exists: true, 
        path: filePath, 
        size: stats.size,
        lastModified: stats.mtime 
      };
    } catch (e) {
      return { exists: false, error: e.message };
    }
  });

  ipcMain.handle('check-app-installed', async () => {
    // Check for common installation markers or just if userData has content
    const userDataPath = app.getPath('userData');
    const versionPath = path.join(userDataPath, 'version.json');
    return fs.existsSync(versionPath);
  });
}

module.exports = {
  registerIpcHandlers,
};
