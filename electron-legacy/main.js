const path = require('node:path');
const { app, BrowserWindow, Menu, clipboard, ipcMain, shell } = require('electron');

const isMac = process.platform === 'darwin';

const SEARCH_ENGINES = {
  bing: 'https://www.bing.com/search?q=',
  google: 'https://www.google.com/search?q=',
  baidu: 'https://www.baidu.com/s?wd=',
};

/** @type {BrowserWindow | null} */
let mainWindow = null;

// Windows 的无边框透明窗口上 isFullScreen() 不可靠，改用显式状态跟踪。
let isFullscreen = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 334,
    minWidth: 360,
    minHeight: 300,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    maximizable: false,
    fullscreenable: true,
    title: 'Timestamp Flow',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    isFullscreen = false;
  });

  // 全屏状态可能由 F11、系统手势或按钮触发，统一回传给渲染层更新布局。
  const sendFullscreenState = (value) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('window:fullscreen-changed', value);
  };

  mainWindow.on('enter-full-screen', () => {
    isFullscreen = true;
    sendFullscreenState(true);
  });

  mainWindow.on('leave-full-screen', () => {
    isFullscreen = false;
    sendFullscreenState(false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
    return true;
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
    return true;
  });

  ipcMain.handle('window:toggle-pin', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next, 'floating');
    return next;
  });

  ipcMain.handle('window:set-pin', (_event, value) => {
    if (!mainWindow) return false;
    const pinned = Boolean(value);
    mainWindow.setAlwaysOnTop(pinned, 'floating');
    return pinned;
  });

  ipcMain.handle('window:toggle-fullscreen', () => {
    if (!mainWindow) return false;
    isFullscreen = !isFullscreen;
    mainWindow.setFullScreen(isFullscreen);
    return isFullscreen;
  });

  ipcMain.handle('clipboard:write', (_event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  // 只接受关键词和引擎标识，URL 一律在主进程按白名单拼装，避免任意地址被打开。
  ipcMain.handle('search:open', async (_event, payload) => {
    const query = String(payload?.query ?? '').trim().slice(0, 500);
    if (!query) return { ok: false, reason: 'empty' };

    const base = SEARCH_ENGINES[String(payload?.engine ?? '')] ?? SEARCH_ENGINES.bing;
    const url = base + encodeURIComponent(query);

    try {
      await shell.openExternal(url);
      return { ok: true, url };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  });

  ipcMain.handle('app:info', () => ({
    platform: process.platform,
    version: app.getVersion(),
  }));
}

// 只允许运行一个实例，重复启动时聚焦已有窗口。
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    // Windows / Linux 不需要默认菜单栏，macOS 保留以支持 Cmd+Q 等快捷键。
    if (!isMac) Menu.setApplicationMenu(null);

    registerIpc();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
