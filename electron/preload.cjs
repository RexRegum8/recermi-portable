const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startBackend: (dbPath) => ipcRenderer.send('start-backend', dbPath),
  selectDbFile: () => ipcRenderer.invoke('select-db-file'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onTunnelReady: (callback) => {
    ipcRenderer.on('tunnel-ready', (_event, value) => callback(value));
    return () => ipcRenderer.removeAllListeners('tunnel-ready');
  },
  getTunnelUrl: () => ipcRenderer.sendSync('get-tunnel-url'),
  getAppVersion: () => ipcRenderer.sendSync('get-app-version'),
  updateTunnelConfig: (config) => ipcRenderer.send('update-tunnel-config', config),
  // Auto-Update
  checkUpdates: () => ipcRenderer.send('check-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
    return () => ipcRenderer.removeAllListeners('update-available');
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('download-progress');
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
    return () => ipcRenderer.removeAllListeners('update-downloaded');
  },
  // Backup & Restore
  checkBackup: () => ipcRenderer.invoke('check-backup'),
  checkDbExists: () => ipcRenderer.invoke('check-db-exists'),
  restoreBackup: () => ipcRenderer.invoke('restore-backup'),
});
