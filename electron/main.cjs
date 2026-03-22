const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Rexermi OS',
    backgroundColor: '#020617', // Match slate-950
  });

  const indexPath = isDev 
    ? 'http://localhost:5173' 
    : path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL(indexPath);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (backendProcess) {
       backendProcess.kill();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
}

function startBackend() {
  if (backendProcess) return;

  console.log('Starting backend process...');
  
  // Try bundled path first, fallback to source
  let backendPath = path.join(__dirname, '../backend/dist/index.cjs');
  let backendCwd = path.join(__dirname, '..');

  // Check if dist exists, if not use src (dev)
  const fs = require('fs');
  if (!fs.existsSync(backendPath)) {
    backendPath = path.join(__dirname, '../backend/src/index.js');
    backendCwd = path.join(__dirname, '../backend');
  }
  
  try {
    backendProcess = require('child_process').fork(backendPath, [], {
      cwd: backendCwd,
      env: { 
        ...process.env,
        PORT: '3001',
        DATABASE_URL: isDev ? undefined : `file:${path.join(app.getPath('userData'), 'rexermi.db')}`
      },
      stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
    
    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });
  } catch (err) {
    console.error('Failed to fork backend process:', err);
  }
}

// IPC to start/stop backend (keeping for manual retries if needed)
ipcMain.on('start-backend', () => startBackend());

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

app.on('ready', () => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
