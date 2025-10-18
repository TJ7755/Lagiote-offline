const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateDistractors: (data) => ipcRenderer.invoke('gemini-generate-distractors', data)
});