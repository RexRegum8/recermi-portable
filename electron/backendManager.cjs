const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { log, error, warn } = require('./logger.cjs');

let backendProcess = null;

function startBackend(isDev, startTunnelCallback, customDbPath = null) {
  if (backendProcess) {
    log('[BACKEND-MNG] Stopping existing backend for restart...');
    stopBackend();
  }

  log('[BACKEND-MNG] Starting backend process...');
  const isPackaged = app.isPackaged;
  
  const appPath = isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : path.join(__dirname, '..');
  
  let backendPath = isPackaged 
    ? path.join(appPath, 'backend/dist/index.cjs')
    : path.join(__dirname, '../backend/dist/index.cjs');
    
  let backendCwd = isPackaged ? appPath : path.join(__dirname, '..');

  if (!fs.existsSync(backendPath)) {
    backendPath = isPackaged
      ? path.join(process.resourcesPath, 'app/backend/src/index.js')
      : path.join(__dirname, '../backend/src/index.js');
    backendCwd = isPackaged
      ? path.join(process.resourcesPath, 'app/backend')
      : path.join(__dirname, '../backend');
  }
  
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    // Determine which database path to use
    let dbPath = customDbPath || path.join(userDataPath, 'rexermi.db');
    
    log(`[BACKEND-MNG] Using database at: ${dbPath}`);

    // Proactive Backup & Version Tracking (only if using default path)
    if (!customDbPath) {
      const versionPath = path.join(userDataPath, 'version.json');
      const currentVersion = app.getVersion();
      let lastVersion = null;
      if (fs.existsSync(versionPath)) {
        try {
          const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
          lastVersion = versionData.version;
        } catch (e) {}
      }

      if (lastVersion !== currentVersion && fs.existsSync(dbPath)) {
          const backupPath = path.join(userDataPath, `rexermi.db.bak`);
          const versionedBackupPath = path.join(userDataPath, `rexermi.db.${lastVersion || 'old'}.bak`);
          try {
            fs.copyFileSync(dbPath, backupPath);
            fs.copyFileSync(dbPath, versionedBackupPath);
            log(`Auto-backup created for version change: ${lastVersion} -> ${currentVersion}`);
          } catch (e) {
            error(`Auto-backup failed: ${e.message}`);
          }
      }
      fs.writeFileSync(versionPath, JSON.stringify({ version: currentVersion }));
      
      // Auto-migrate from older/portable versions
      if (!fs.existsSync(dbPath)) {
        const oldDbPath = path.join(backendCwd, 'backend/prisma/dev.db');
        if (fs.existsSync(oldDbPath)) {
          try {
            fs.copyFileSync(oldDbPath, dbPath);
            log('Successfully migrated dev.db to rexermi.db in userData');
          } catch (e) {
            error(`Failed to migrate dev.db: ${e.message}`);
          }
        }
      }
    }

    // Harden DATABASE_URL for Windows
    const dbUri = `file:${dbPath.replace(/\\/g, '/')}`;
    log(`[BACKEND-MNG] Final DATABASE_URL: ${dbUri}`);

    backendProcess = fork(backendPath, [], {
      cwd: backendCwd,
      env: { 
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: '3001',
        DATABASE_URL: dbUri
      },
      stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => {
      log(`[BACKEND] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      error(`[BACKEND-ERR] ${data.toString().trim()}`);
    });

    backendProcess.on('exit', (code) => {
      warn(`[BACKEND-MNG] Backend process exited with code ${code}`);
      backendProcess = null;
    });

    if (startTunnelCallback) {
      startTunnelCallback();
    }

    return backendProcess;
  } catch (err) {
    error(`Failed to fork backend process: ${err.message}`);
  }
}

function stopBackend() {
  if (backendProcess) {
    log('[BACKEND-MNG] Stopping backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
}

module.exports = {
  startBackend,
  stopBackend,
};
