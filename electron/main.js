/**
 * MindOS — Electron Main Process
 * Carrega o build web do Expo (dist/) dentro de uma janela nativa.
 * Suporta: macOS, Windows, Linux
 */

const { app, BrowserWindow, shell, Menu, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

// ─── Configurações ─────────────────────────────────────────────────────────────
// CORREÇÃO: porta atualizada de 19006 → 8081.
// Expo SDK 49+ mudou a porta padrão do Metro bundler de 19006 para 8081.
// Com a porta errada, o Electron abriria uma página em branco no modo dev.
const DEV_URL       = 'http://localhost:8081'; // expo start --web (Metro porta 8081)
const DIST_DIR      = path.join(__dirname, '..', 'dist');
const IS_DEV        = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const IS_MAC        = process.platform === 'darwin';
const IS_WIN        = process.platform === 'win32';

let mainWindow = null;

// ─── Cria a janela principal ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    titleBarStyle:   IS_MAC ? 'hiddenInset' : 'default',
    backgroundColor: '#0D0D0F',          // igual ao COLORS.background do app
    show:            false,              // mostra só após pronto (evita flash branco)
    icon:            getAppIcon(),
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      contextIsolation:    true,
      nodeIntegration:     false,
      webSecurity:         true,
      allowRunningInsecureContent: false,
    },
  });

  // Mostra janela quando carregou (sem flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Abre links externos no navegador padrão, não no Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Carrega a URL correta
  if (IS_DEV) {
    mainWindow.loadURL(DEV_URL);
  } else {
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Fallback: avisa que o build não existe
      mainWindow.loadURL(`data:text/html,
        <html style="background:#0D0D0F;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="text-align:center">
            <h2>Build não encontrado</h2>
            <p>Execute <code style="background:#1a1a1f;padding:4px 8px;border-radius:4px">npm run build:web</code> antes de abrir o app desktop.</p>
          </div>
        </html>
      `);
    }
  }

  // Mantém o título sempre como "MindOS" independente da rota
  mainWindow.webContents.on('page-title-updated', (e) => {
    e.preventDefault();
    mainWindow.setTitle('MindOS');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Ícone por plataforma ───────────────────────────────────────────────────────
function getAppIcon() {
  const base = path.join(__dirname, '..', 'assets', 'images');
  if (IS_WIN)  return path.join(base, 'icon.png');
  if (IS_MAC)  return path.join(base, 'icon.png');
  return path.join(base, 'icon.png');
}

// ─── Menu da aplicação ─────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    ...(IS_MAC ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Sobre MindOS' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair do MindOS' },
      ],
    }] : []),
    {
      label: 'Arquivo',
      submenu: [
        IS_MAC ? { role: 'close', label: 'Fechar Janela' } : { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Forçar Recarregamento' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Padrão' },
        { role: 'zoomIn', label: 'Aumentar Zoom' },
        { role: 'zoomOut', label: 'Diminuir Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' },
        ...(IS_DEV ? [{ type: 'separator' }, { role: 'toggleDevTools', label: 'DevTools' }] : []),
      ],
    },
    {
      label: 'Janela',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(IS_MAC ? [
          { type: 'separator' },
          { role: 'front', label: 'Trazer Tudo para Frente' },
        ] : [
          { role: 'close', label: 'Fechar' },
        ]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC: Tema do sistema ───────────────────────────────────────────────────────
ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

ipcMain.handle('get-app-version', () => app.getVersion());

// ─── Ciclo de vida do app ───────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // macOS: recria janela ao clicar no dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Sai quando todas as janelas fecham (exceto macOS)
app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit();
});

// Segurança: bloqueia navegação para URLs externas
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowed = IS_DEV
      ? [DEV_URL]
      : [`file://${DIST_DIR}`];
    const isAllowed = allowed.some(u => url.startsWith(u)) || url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
