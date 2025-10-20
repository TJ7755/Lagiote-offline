// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain } = require('electron'); // <-- Add ipcMain here
const path = require('path');
require('dotenv').config(); // This now correctly loads your environment variables

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Securely access the key

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

ipcMain.handle('gemini-generate-deck', async (event, { documents }) => {
  console.log(`Received request to generate a deck from ${documents.length} documents.`);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // Dynamically build the context string from all provided documents.
  const contextString = documents.map((doc, index) => {
    // For images, we provide a description instead of the raw data.
    const content = doc.type.startsWith('image/') 
      ? `[Image named: ${doc.name}]` 
      : doc.content;
    return `--- Document ${index + 1}: ${doc.name} ---\n${content}\n`;
  }).join('\n');

  const prompt = `You are an expert in cognitive science, tasked with creating scientifically-optimal, atomic flashcards by synthesizing information from the provided documents.

${contextString}

Rules for creating the flashcards:
1.  **Synthesize:** Base the flashcards on the information contained within the documents.
2.  **Atomicity:** Each flashcard must test only ONE single, isolated piece of information.
3.  **Clarity:** The question must be unambiguous and have one clear, correct answer.
4.  **Brevity:** Keep questions and answers as short as possible.
5.  **Comprehensiveness:** Cover all key concepts from the documents without redundancy.

Return the output as a single, minified JSON array of objects, with no other text or explanation. Each object must have a "question" key and an "answer" key.

Example format: [{"question":"What is the powerhouse of the cell?","answer":"Mitochondria"},{"question":"What is the chemical formula for water?","answer":"H2O"}]`;

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
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API returned a successful response but with no candidates. This might be due to safety filters.");
      console.error("API Response:", data);
      throw new Error("Content generation blocked by API.");
    }
    const textResponse = data.candidates[0].content.parts[0].text;
    
    const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedCards = JSON.parse(cleanedJson);
    
    console.log(`Successfully generated ${generatedCards.length} cards.`);
    return generatedCards;

  } catch (error) {
    console.error('Failed to generate deck with Gemini API:', error);
    return null;
  }
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
    
    console.log('[Main Process - Test 1] Returning distractors:', distractors);
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