import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { t } from 'fyo';
import { showDialog, showToast } from 'src/utils/interactive';
import { fyo } from 'src/initFyo';

export function useUpdater() {
  async function checkForUpdates() {
    const isTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
    if (!isTauri) {
      return;
    }

    try {
      const update = await check();
      if (update && update.available) {
        const nextVersion = update.version;

        const confirmDownload = await showDialog({
          title: t`Update Available`,
          detail: t`Download version ${nextVersion}?`,
          type: 'info',
          buttons: [
            { label: t`Yes`, isPrimary: true, action: () => true },
            { label: t`No`, isEscape: true, action: () => false },
          ],
        });

        if (!confirmDownload) {
          return;
        }

        showToast({
          message: t`Downloading update...`,
          type: 'info',
        });

        await update.downloadAndInstall();

        const confirmRestart = await showDialog({
          title: t`Update Downloaded`,
          detail: t`Restart Auditbooks to install update?`,
          type: 'info',
          buttons: [
            { label: t`Yes`, isPrimary: true, action: () => true },
            { label: t`No`, isEscape: true, action: () => false },
          ],
        });

        if (!confirmRestart) {
          return;
        }

        await relaunch();
      }
    } catch (error) {
      // Gracefully ignore offline or connection issues during updater check
      console.warn('Update check failed:', error);
    }
  }

  return {
    checkForUpdates,
  };
}
