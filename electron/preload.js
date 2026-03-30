/**
 * MindOS — Electron Preload Script
 * Expõe APIs seguras ao renderer via contextBridge.
 * Roda no contexto isolado antes do carregamento da página.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do sistema
  getSystemTheme:  () => ipcRenderer.invoke('get-system-theme'),
  getAppVersion:   () => ipcRenderer.invoke('get-app-version'),

  // Utilitário: detecta se está rodando dentro do Electron
  isElectron: true,
  platform: process.platform,   // 'darwin' | 'win32' | 'linux'
});
