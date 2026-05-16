import { app } from 'electron';
import { Main } from '../main';
import { emitMainProcessError } from 'backend/helpers';

export default function registerAppLifecycleListeners(main: Main) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (main.mainWindow === null) {
      main.createWindow().catch((err) => emitMainProcessError(err));
    }
  });

  app.on('ready', () => {
    main.createWindow().catch((err) => emitMainProcessError(err));
  });
}
