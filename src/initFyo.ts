import { Fyo } from "fyo";
import { markRaw } from "vue";

/**
 * Global fyo: this is meant to be used only by the app. For
 * testing purposes a separate instance of fyo should be initialized.
 */

export const fyo = markRaw(new Fyo({ isTest: false, isElectron: true }));
