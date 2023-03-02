import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import cookie from 'cookie';
import path from 'path';
import os from 'os';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(
      path.join(app.getPath('userData'), 'DevTools Extensions'),
    );
  }
} catch (_) {}

let mainWindow: BrowserWindow | undefined;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
    show: false,
  });

  mainWindow.maximize();
  mainWindow.show();

  mainWindow.loadURL(process.env.APP_URL);

  // if (process.env.DEBUGGING) {
  //   mainWindow.webContents.openDevTools();
  // } else {
  //   // we're on production; no access to devtools pls
  //   mainWindow.webContents.on('devtools-opened', () => {
  //     mainWindow?.webContents.closeDevTools();
  //   });
  // }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  // Helpers

  function setValue(obj: any, key: string, value: any) {
    const lowerCaseKey = key.toLowerCase();

    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerCaseKey) {
        obj[key] = value;
        return;
      }
    }

    obj[key] = value;
  }

  function getValue(obj: any, key: string) {
    const lowerCaseKey = key.toLowerCase();

    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerCaseKey) {
        return obj[key];
      }
    }
  }

  // Disable CORS and handle cookies

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.deepnotes.app/*', 'wss://*.deepnotes.app/*'] },
    async (details, callback) => {
      console.log('Intercepting request: ' + details.url);

      setValue(details.requestHeaders, 'Origin', 'https://deepnotes.app');

      const cookies = await mainWindow?.webContents.session.cookies.get({
        url: 'https://deepnotes.app',
      });

      console.log('Injecting cookies', cookies);

      setValue(
        details.requestHeaders,
        'cookie',
        cookies?.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      );

      callback(details as any);
    },
  );

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['https://*.deepnotes.app/*', 'wss://*.deepnotes.app/*'] },
    (details, callback) => {
      console.log('Intercepting response: ' + details.url);

      setValue(details.responseHeaders, 'Access-Control-Allow-Origin', ['*']);
      setValue(details.responseHeaders, 'Access-Control-Allow-Headers', ['*']);

      console.log(
        'Set-Cookie',
        getValue(details.responseHeaders, 'set-cookie'),
      );

      for (const cookieStr of getValue(details.responseHeaders, 'set-cookie') ??
        []) {
        const parsedCookie = cookie.parse(cookieStr);

        const cookieName = Object.keys(parsedCookie)[0];

        const expires = getValue(parsedCookie, 'Expires');
        const sameSite = getValue(parsedCookie, 'SameSite');

        const cookieDetails = {
          url: 'https://deepnotes.app',
          name: cookieName,
          value: parsedCookie[cookieName],
          // domain: getValue(parsedCookie, 'Domain'),
          // path: getValue(parsedCookie, 'Path'),
          // secure: getValue(parsedCookie, 'Secure'),
          // httpOnly: getValue(parsedCookie, 'HttpOnly'),
          expirationDate: expires ? new Date(expires).getTime() : undefined,
          // sameSite:
          //   sameSite?.toLowerCase() !== 'none'
          //     ? sameSite?.toLowerCase()
          //     : 'no_restriction',
        };

        void mainWindow?.webContents.session.cookies
          .set(cookieDetails)
          .then(() => console.error('Cookie set success'))
          .catch(() => console.error('Cookie set failed'));
      }

      callback(details as any);
    },
  );
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    createWindow();
  }
});

ipcMain.handle('isLoggedIn', async () => {
  const cookies = await mainWindow?.webContents.session.cookies.get({
    url: 'https://deepnotes.app',
    name: 'loggedIn',
  });

  return cookies?.[0]?.value === 'true';
});

ipcMain.handle('clearLoggedInCookie', () => {
  void mainWindow?.webContents.session.cookies
    .remove('https://deepnotes.app', 'loggedIn')
    .then(() => console.error('Cookie set success'))
    .catch(() => console.error('Cookie set failed'));
});
