'use strict';
const {app, BrowserWindow, Menu, shell} = require('electron');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
let window;
const entry = path.join(__dirname, 'game', 'index.html');
const entryURL = pathToFileURL(entry).href;
const externalHosts = new Set(['cs.msu.ru', 'creativecommons.org']);
function openReference(url) {
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && externalHosts.has(parsed.hostname)) shell.openExternal(parsed.href); } catch (_) {}
}
app.setName('Gurov');
app.setAppUserModelId('local.gurov.lastlemma');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    window = new BrowserWindow({
      width: 1280, height: 760, minWidth: 840, minHeight: 500,
      title: 'Гуров — Последний удовл', backgroundColor: '#0a1220', show: false,
      webPreferences: {sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, spellcheck: false}
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label: 'Игра', submenu: [{label: 'Полный экран', accelerator: 'F11', click: () => window.setFullScreen(!window.isFullScreen())}, {type: 'separator'}, {label: 'Выход', role: 'quit'}]}
    ]));
    window.webContents.setWindowOpenHandler(({url}) => {openReference(url); return {action: 'deny'};});
    window.webContents.on('will-navigate', (event, url) => { if (url !== entryURL) {event.preventDefault(); openReference(url);} });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.webContents.session.setPermissionCheckHandler(() => false);
    window.once('ready-to-show', () => window.show());
    window.on('closed', () => {window = null;});
    window.loadFile(entry);
  });
  app.on('window-all-closed', () => app.quit());
}
