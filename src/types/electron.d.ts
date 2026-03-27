export interface IElectronAPI {
  startBackend: (dbPath?: string) => void;
  selectDbFile: () => Promise<string | null>;
  openExternal: (url: string) => void;
  onTunnelReady: (callback: (url: string) => void) => () => void;
  getTunnelUrl: () => string;
  getAppVersion: () => string;
  updateTunnelConfig: (config: { mode: string; token: string }) => void;
  checkUpdates: () => void;
  installUpdate: () => void;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onDownloadProgress: (callback: (progress: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  checkBackup: () => Promise<boolean>;
  checkDbExists: () => Promise<boolean>;
  restoreBackup: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
