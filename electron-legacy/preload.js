const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clockApi', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
  setPin: (value) => ipcRenderer.invoke('window:set-pin', value),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  onFullscreenChange: (callback) => {
    const listener = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('window:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', listener);
  },
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  openSearch: (engine, query) => ipcRenderer.invoke('search:open', { engine, query }),
  info: () => ipcRenderer.invoke('app:info'),
});
