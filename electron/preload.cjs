const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startBackend: () => ipcRenderer.send('start-backend'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  // Add more IPC helpers as needed
});
