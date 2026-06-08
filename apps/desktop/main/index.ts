import { app, BrowserWindow, Menu, shell } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppConfigStore } from './config/app-config.js';
import { closeDatabase } from './database/database-manager.js';
import { registerIpcHandlers } from './ipc/register-handlers.js';
import { restartScheduledBackupJob } from './scheduled-backup-job.js';
import { sessionManager } from './session/session-manager.js';

let appConfig: AppConfigStore;
let mainWindow: BrowserWindow | null = null;

function navigateRenderer(route: string): void {
  mainWindow?.webContents.send('app:navigate', route);
}

function resolvePreloadPath(): string {
  const candidates = [
    join(__dirname, '../preload/index.mjs'),
    join(__dirname, '../preload/index.js'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Preload script not found. Checked: ${candidates.join(', ')}`);
  }
  return found;
}

function buildApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Member Outstanding',
          click: () => navigateRenderer('/app/reports/RPT-B07'),
        },
        {
          label: 'Voucher Register',
          click: () => navigateRenderer('/app/reports/RPT-A01'),
        },
        {
          label: 'General Ledger',
          click: () => navigateRenderer('/app/reports/RPT-A04'),
        },
        {
          label: 'Bill Register',
          click: () => navigateRenderer('/app/reports/RPT-B01'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  appConfig = new AppConfigStore(app.getPath('userData'));
  buildApplicationMenu();
  registerIpcHandlers(appConfig);
  restartScheduledBackupJob(appConfig);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  sessionManager.clear();
  await closeDatabase();
});
