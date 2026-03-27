const { BrowserWindow, shell, app } = require('electron');
const path = require('path');
const { log } = require('./logger.cjs');

let mainWindow = null;

function createMainWindow(isDev) {
  log('[WINDOW-MNG] Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Rexermi OS',
  });

  const indexPath = isDev 
    ? 'http://localhost:5173' 
    : path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL(indexPath);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
      log(`[WINDOW-MNG] Failed to load index.html: ${err.message}`);
    });
  }

  mainWindow.once('ready-to-show', () => {
    log('[WINDOW-MNG] Main window ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
};
