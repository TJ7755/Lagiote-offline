// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

require('update-electron-app')();

if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // <-- 1. Keep the window hidden on startup
    backgroundColor: '#f7fafc', // <-- 2. Set a background color that matches your app's light theme
    webPreferences: {
      // The preload script is a secure bridge between Electron's Node.js environment
      // and your web page (the "renderer" process).
      preload: path.join(__dirname, 'preload.js'),
      
      // These are important for security
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // 3. Use the 'ready-to-show' event to show the window only when the page is fully rendered.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Optional: Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  require('./menu.js'); 

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});