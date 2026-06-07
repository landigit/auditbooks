import { Fyo } from "fyo";
import { ipc as polyfillIpc } from "./ipc-polyfill";

/**
 * Global fyo: this is meant to be used only by the app. For
 * testing purposes a separate instance of fyo should be initialized.
 */

export const fyo = new Fyo({ isTest: false, isElectron: true });
export const ipc = polyfillIpc;
