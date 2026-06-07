import { DialogOptions, ToastOptions } from "./types.js";

export const isLynx = true;

export async function showDialog<DO extends DialogOptions>(options: DO): Promise<any> {
  console.info(`[Lynx Dialog] Title: ${options.title}, Detail: ${options.detail}`);
  if (options.buttons && options.buttons.length > 0) {
    const primaryBtn = options.buttons.find((b) => b.isPrimary) || options.buttons[0];
    if (primaryBtn && typeof primaryBtn.action === "function") {
      return await primaryBtn.action();
    }
  }
  return null;
}

export function showToast(options: ToastOptions) {
  console.info(`[Lynx Toast] Message: ${options.message}`);
}

export function getIconConfig() {
  return {
    iconName: "alert-circle",
    color: "blue",
    iconColor: "",
    containerBorder: "",
    containerBackground: "",
  };
}
