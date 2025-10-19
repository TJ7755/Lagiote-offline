// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
require('dotenv').config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#f7fafc',
    webPreferences: {

      preload: path.join(__dirname, 'preload.js'),
      
      contextIsolation: true,

      nodeIntegration: false,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
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

ipcMain.handle('gemini-generate-distractors', async (event, { question, answer }) => {
  console.log("Received request to generate distractors for:", question);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are an expert quiz creator. For the following flashcard, generate exactly three plausible but incorrect multiple-choice options (distractors).

Question: "${question}"
Correct Answer: "${answer}"

Rules:
1. The distractors must be in the same language as the correct answer.
2. The distractors should be related to the question's topic to be challenging.
3. Provide ONLY the three incorrect options, each on a new line.
4. DO NOT include the correct answer, any numbering, or any extra text.
5. Make sure the distractors are similar in length and complexity to the correct answer.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    const distractors = textResponse.split('\n').filter(line => line.trim() !== '');
    
    console.log("Generated Distractors:", distractors);
    return distractors;

  } catch (error) {
    console.error('Failed to call Gemini API:', error);
    return null;
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

