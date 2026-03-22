export interface IElectronAPI {
  startBackend: () => void;
  openExternal: (url: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
