import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: 打开文件对话框
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { filePath: null };
  }
  return { filePath: result.filePaths[0] };
});

// IPC: 保存文件对话框 + 写入
ipcMain.handle('dialog:saveFile', async (_event, content: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    defaultPath: 'untitled.json',
  });
  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return { filePath: result.filePath };
});

// IPC: 读取文件
ipcMain.handle('file:read', async (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8');
});

// IPC: 写入文件
ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8');
});

// IPC: 消息对话框
ipcMain.handle('dialog:showMessageBox', async (_event, options: { type: string; title: string; message: string; buttons: string[]; cancelId: number }) => {
  const result = await dialog.showMessageBox(mainWindow!, options);
  return result;
});
