import { Fyo } from 'fyo';

/**
 * Global fyo: this is meant to be used only by the app. For
 * testing purposes a separate instance of fyo should be initialized.
 */

// We are running in Tauri — never in Electron
const isElectron = false;

export const fyo = new Fyo({ isTest: false, isElectron });

